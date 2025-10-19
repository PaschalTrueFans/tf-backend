import { Db } from '../../../../database/db';
import { AppError, BadRequest } from '../../../../helpers/errors';
import { Logger } from '../../../../helpers/logger';
import { Entities, Hash } from '../../../../helpers';
import * as PostModel from '../models/post.model';
import * as UserModels from '../models/user.model';
import * as AuthModel from '../models/auth.model';
import { User } from '../../../../helpers/entities';
import * as Token from '../../../../helpers/token';
import { generatePassword } from '../../../../helpers/generateRandomPassword';
import { hashPassword } from '../../../../helpers/hash';
import { generateRandomOTP } from '../../../../helpers/generateRandomOTP';
import moment from 'moment';
import { EmailService } from '../../../../helpers/email';

export class UserService {
  private db: Db;
  private emailService: EmailService;

  constructor(args: { db: Db }) {
    Logger.info('UserService initialized...');
    this.db = args.db;
    this.emailService = new EmailService();
  }

  public async GetUserById(userId: string): Promise<UserModels.UserResponse> {
    Logger.info('UserService.GetUserById', { userId });

    const user = await this.db.v1.User.GetUser({ id: userId });

    if (!user) throw new BadRequest('User not found');

    // Structure the response
    const response: UserModels.UserResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      creator: null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // If user has creator fields, add them to the creator object
    if (user.pageName) {
      response.creator = {
        pageName: user.pageName,
        creatorName: user.creatorName!,
        is18Plus: user.is18Plus || false,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        coverPhoto: user.coverPhoto,
        introVideo: user.introVideo,
        themeColor: user.themeColor,
        socialLinks: user.socialLinks,
        tags: user.tags,
        categoryId: user.categoryId,
      };
    }

    return response;
  }

  public async UpdateUser(userId: string, updateData: Partial<User>): Promise<void> {
    Logger.info('UserService.UpdateUser', { userId, updateData });

    const {socialLinks} = updateData;
    if (socialLinks) {
      updateData.socialLinks = JSON.stringify(socialLinks);
    }

    const updatedUser = await this.db.v1.User.UpdateUser(userId, updateData);

    if (!updatedUser) throw new BadRequest('User not found or update failed');

  }

  public async GetAllCreators(currentUserId?: string): Promise<UserModels.CreatorProfile[] |any > {
    Logger.info('UserService.GetAllCreators', { currentUserId });

    const creators = await this.db.v1.User.GetAllCreatorsWithFollowStatus(currentUserId);

    if (!creators) return [];

    return creators.map((creator: any) => ({
      id: creator.id,
      pageName: creator.pageName!,
      creatorName: creator.creatorName!,
      is18Plus: creator.is18Plus || false,
      profilePhoto: creator.profilePhoto,
      bio: creator.bio,
      coverPhoto: creator.coverPhoto,
      introVideo: creator.introVideo,
      themeColor: creator.themeColor,
      socialLinks: creator.socialLinks,
      isFollowing: creator.isfollowing,
      followersCount: parseInt(creator.followersCount) || 0,
      tags: creator.tags || ['music', 'videos', 'entertainment'],
      category: creator.category || 'music',
      subscribersCount: parseInt(creator.subscribersCount) || 17,
    }));
  }

  public async GetCreatorById(creatorId: string, currentUserId?: string): Promise<UserModels.CreatorProfile | null | any> {
    Logger.info('UserService.GetCreatorById', { creatorId, currentUserId });

    const creator = await this.db.v1.User.GetCreatorByIdWithFollowStatus(creatorId, currentUserId);
    const recentPosts = await this.db.v1.User.GetRecentPostsByCreator(creatorId);

    return {
      id: creator.id,
      pageName: creator.pageName,
      creatorName: creator.creatorName,
      is18Plus: creator.is18Plus || false,
      profilePhoto: creator.profilePhoto,
      bio: creator.bio,
      coverPhoto: creator.coverPhoto,
      introVideo: creator.introVideo,
      themeColor: creator.themeColor,
      socialLinks: creator.socialLinks,
      tags: creator.tags,
      categoryId: creator.categoryId,
      isFollowing: creator.isfollowing,
      createdAt: creator.createdAt,
      updatedAt: creator.updatedAt,
      followersCount: parseInt(creator.followersCount) || 0,
      subscribersCount: parseInt(creator.subscribersCount) || 17,
      category: creator.category || 'music',
      totalPosts: parseInt(creator.totalPosts) || 0,
      memberships:[
        {
          id: '1',
          name: 'Free',
          price: 0,
          currency: 'NGN',
        },
        {
          id: '2',
          name: 'Subscription',
          price: 9.99,
          currency: 'NGN',
        },
      ],
      recentPosts: recentPosts.map((post: any) => ({
        id: post.id,
        title: post.title,
        createdAt: post.createdAt,
        public: (post.accessType || 'free') === 'free',
        totalLikes: parseInt(post.totalLikes) || 0,
        totalComments: parseInt(post.totalComments) || 0,
        mediaFiles: post.mediaFiles || [],
      })),
      exploreOthers: [
        {
          id:  '1',
          title:  'Title 1',
          createdAt: new Date().toISOString(),
          public:  true,
          totalLikes:  10,
          totalComments: 10,
        },
        {
          id: '2',
          title: 'Title 2',
          public:  false,
          createdAt:  new Date().toISOString(),
          totalLikes:  15,
          totalComments:  15,
        },
        {
          id:  '3',
          title:  'Title 3',
          createdAt: new Date().toISOString(),
          public:  true,
          totalLikes:  10,
          totalComments: 10,
        },
        {
          id: '4',
          title: 'Title 4',
          public:  false,
          createdAt:  new Date().toISOString(),
          totalLikes:  15,
          totalComments:  15,
        },
      
      ]
    }
  }

  public async GetCreatorByPageName(pageName: string, currentUserId?: string): Promise<UserModels.CreatorProfile | null | any> {
    Logger.info('UserService.GetCreatorByPageName', { pageName, currentUserId });

    const creator = await this.db.v1.User.GetCreatorByPageNameWithFollowStatus(pageName, currentUserId);
    const recentPosts = await this.db.v1.User.GetRecentPostsByCreator(creator.id);
    if (!creator) {
      throw new BadRequest('Creator not found');
    }

    return {
      id: creator.id,
      pageName: creator.pageName,
      creatorName: creator.creatorName,
      is18Plus: creator.is18Plus || false,
      profilePhoto: creator.profilePhoto,
      bio: creator.bio,
      coverPhoto: creator.coverPhoto,
      introVideo: creator.introVideo,
      themeColor: creator.themeColor,
      socialLinks: creator.socialLinks,
      tags: creator.tags,
      categoryId: creator.categoryId,
      isFollowing: creator.isFollowing,
      createdAt: creator.createdAt,
      updatedAt: creator.updatedAt,
      followersCount: parseInt(creator.followersCount) || 0,
      subscribersCount: parseInt(creator.subscribersCount) || 17,
      category: creator.category || 'music',
      totalPosts: parseInt(creator.totalPosts) || 0,
      memberships:[
        {
          id: '1',
          name: 'Free',
          price: 0,
          currency: 'NGN',
        },
        {
          id: '2',
          name: 'Subscription',
          price: 9.99,
          currency: 'NGN',
        },
      ],
      recentPosts: recentPosts.map((post: any) => ({
        id: post.id,
        title: post.title,
        createdAt: post.createdAt,
        public: (post.accessType || 'free') === 'free',
        totalLikes: parseInt(post.totalLikes) || 0,
        totalComments: parseInt(post.totalComments) || 0,
        mediaFiles: post.mediaFiles || [],
      })),
      exploreOthers: [
        {
          id:  '1',
          title:  'Title 1',
          createdAt: new Date().toISOString(),
          public:  true,
          totalLikes:  10,
          totalComments: 10,
        },
        {
          id: '2',
          title: 'Title 2',
          public:  false,
          createdAt:  new Date().toISOString(),
          totalLikes:  15,
          totalComments:  15,
        },
        {
          id:  '3',
          title:  'Title 3',
          createdAt: new Date().toISOString(),
          public:  true,
          totalLikes:  10,
          totalComments: 10,
        },
        {
          id: '4',
          title: 'Title 4',
          public:  false,
          createdAt:  new Date().toISOString(),
          totalLikes:  15,
          totalComments:  15,
        },
      
      ]
    }
  }

  public async ToggleFollowCreator(userId: string, followerId: string): Promise<{ action: 'followed' | 'unfollowed'; isFollowing: boolean }> {
    Logger.info('UserService.ToggleFollowCreator', { userId, followerId });

    // Check if the user to follow exists and is a creator
    const creator = await this.db.v1.User.GetUser({ id: userId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('Creator not found');
    }

    // Cannot follow yourself
    if (userId === followerId) {
      throw new BadRequest('Cannot follow yourself');
    }

    return await this.db.v1.User.ToggleFollowUser(userId, followerId);
  }

  // Posts CRUD
  public async CreatePost(creatorId: string, body: PostModel.CreatePostBody): Promise<string> {
    Logger.info('UserService.CreatePost', { creatorId, body: { ...body, content: '[omitted]' } });

    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action');
    }

    const post: Partial<Entities.Post> = {
      creatorId,
      title: body.title,
      content: body.content,
      accessType: body.accessType ?? 'free',
      tags: body.tags,
    };
    const mediaFiles = body.mediaFiles?.map((m) => ({
      type: m.type,
      url: m.url,
      name: m.name,
      size: m.size,
    }));
    const id = await this.db.v1.User.CreatePost(post, mediaFiles);
    return id;
  }

  public async UpdatePost(postId: string, body: PostModel.UpdatePostBody): Promise<Entities.Post | null> {
    Logger.info('UserService.UpdatePost', { postId, body: { ...body, content: '[omitted]' } });
    const updated = await this.db.v1.User.UpdatePost(postId, body as Partial<Entities.Post>);
    if (body.mediaFiles) {
      const mediaFiles = body.mediaFiles.map((m) => ({ type: m.type, url: m.url, name: m.name, size: m.size }));
      await this.db.v1.User.ReplacePostMedia(postId, mediaFiles);
    }
    return updated;
  }

  public async DeletePost(postId: string): Promise<void> {
    Logger.info('UserService.DeletePost', { postId });
    await this.db.v1.User.DeletePost(postId);
  }

  public async GetAllPosts(userId: string, page: number = 1, limit: number = 10): Promise<{
    posts: any[];
    pagination: {
      currentPage: number;
      limit: number;
      totalPosts: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    Logger.info('UserService.GetAllPosts', { userId, page, limit });

// Three types of POSTS
// 1. Paid Posts membership based
// 2. Posts by followed creators
// 3. Free Posts By Other Creators 

// 1. Paid Posts membership based

// 2. Posts by followed creators
    const followedPosts = await this.db.v1.User.GetAllPostsByFollowedCreator(userId, page, limit);

// 3. Free Posts By Other Creators 
    const publicPosts = await this.db.v1.User.GetPublicPostsByOtherCreators(userId, page, limit);

    // Combine posts from both sources
    const allPosts = [...followedPosts, ...publicPosts];
    
    // Sort by creation date (most recent first)
    allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination to combined results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPosts = allPosts.slice(startIndex, endIndex);

    // Calculate pagination metadata
    const totalPosts = allPosts.length;
    const totalPages = Math.ceil(totalPosts / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const posts = paginatedPosts.map((r: any) => ({
      postId: r.postId,
      postTitle: r.postTitle,
      content: this.stripHtmlAndTruncate(r.content, 100),
      createdAt: r.createdAt,
      tags: r.tags || [],
      attachedMedia: r.attachedMedia || [],
      creatorId: r.creatorId,
      creatorImage: r.creatorImage,
      pageName: r.pageName,
      totalLikes: parseInt(r.totalLikes) || 0,
      totalComments: parseInt(r.totalComments) || 0,
    }));

    return {
      posts,
      pagination: {
        currentPage: page,
        limit,
        totalPosts,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  private stripHtmlAndTruncate(content: string, maxLength: number): string {
    if (!content) return '';
    
    // Remove HTML tags
    const stripped = content.replace(/<[^>]*>/g, '');
    
    // Remove extra whitespace and newlines
    const cleaned = stripped.replace(/\s+/g, ' ').trim();
    
    // Truncate to maxLength
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength) + '...';
  }

  public async GetPostById(postId: string, userId: string): Promise<any | null> {
    Logger.info('UserService.GetPostById', { postId, userId });
    const row = await this.db.v1.User.GetPostById(postId);
    if (!row) return null;
    
    // Check if current user has liked this post
    let isLiked = false;
    if (userId) {
      const existingLike = await this.db.v1.User.GetPostLike(postId, userId);
      isLiked = !!existingLike;
    }
    
    return {
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      creatorId: row.creatorId,
      title: row.title,
      content: row.content,
      accessType: row.accessType,
      tags: row.tags,
      totalLikes: parseInt(row.totalLikes) || 0,
      isLiked: isLiked,
      creatorName: row.creatorName,
      creatorImage: row.creatorImage,
      categoryName: row.categoryName,
      mediaFiles: (row.mediaFiles || []).map((m: any) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        name: m.name,
        size: m.size,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      comments: (row.comments || []).map((c: any) => ({
        id: c.id,
        comment: c.comment,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        userId: c.userId,
        userName: c.userName,
        userImage: c.userImage,
      })),
    };
  }

  // Membership CRUD methods with creator validation
  public async CreateMembership(creatorId: string, body: any): Promise<string> {
    Logger.info('UserService.CreateMembership', { creatorId, body });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can create memberships.');
    }

    const membership: Partial<Entities.Membership> = {
      creatorId,
      name: body.name,
      price: body.price,
      currency: body.currency || 'NGN',
      description: body.description,
    };

    const id = await this.db.v1.User.CreateMembership(membership);
    return id;
  }

  public async GetMembershipsByCreator(creatorId: string): Promise<Entities.Membership[]> {
    Logger.info('UserService.GetMembershipsByCreator', { creatorId });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can view memberships.');
    }

    return await this.db.v1.User.GetMembershipsByCreator(creatorId);
  }

  public async GetMembershipById(membershipId: string): Promise<Entities.Membership | null> {
    Logger.info('UserService.GetMembershipById', { membershipId });
    return await this.db.v1.User.GetMembershipById(membershipId);
  }

  public async UpdateMembership(membershipId: string, creatorId: string, body: any): Promise<Entities.Membership | null> {
    Logger.info('UserService.UpdateMembership', { membershipId, creatorId, body });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can update memberships.');
    }

    // Check if membership belongs to this creator
    const membership = await this.db.v1.User.GetMembershipById(membershipId);
    if (!membership) {
      throw new BadRequest('Membership not found');
    }

    if (membership.creatorId !== creatorId) {
      throw new BadRequest('You do not have permission to update this membership.');
    }

    const updateData: Partial<Entities.Membership> = {
      name: body.name,
      price: body.price,
      currency: body.currency,
      description: body.description,
    };

    return await this.db.v1.User.UpdateMembership(membershipId, updateData);
  }

  public async DeleteMembership(membershipId: string, creatorId: string): Promise<void> {
    Logger.info('UserService.DeleteMembership', { membershipId, creatorId });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can delete memberships.');
    }

    // Check if membership belongs to this creator
    const membership = await this.db.v1.User.GetMembershipById(membershipId);
    if (!membership) {
      throw new BadRequest('Membership not found');
    }

    if (membership.creatorId !== creatorId) {
      throw new BadRequest('You do not have permission to delete this membership.');
    }

    await this.db.v1.User.DeleteMembership(membershipId);
  }

  // Comment CRUD methods
  public async AddComment(postId: string, userId: string, comment: string): Promise<string> {
    Logger.info('UserService.AddComment', { postId, userId, comment: comment.substring(0, 50) + '...' });

    // Verify that the post exists
    const post = await this.db.v1.User.GetPostById(postId);
    if (!post) {
      throw new BadRequest('Post not found');
    }

    // Verify that the user exists
    const user = await this.db.v1.User.GetUser({ id: userId });
    if (!user) {
      throw new BadRequest('User not found');
    }

    const commentId = await this.db.v1.User.AddComment(postId, userId, comment);
    return commentId;
  }

  public async DeleteComment(commentId: string, userId: string): Promise<void> {
    Logger.info('UserService.DeleteComment', { commentId, userId });

    // Verify that the user exists
    const user = await this.db.v1.User.GetUser({ id: userId });
    if (!user) {
      throw new BadRequest('User not found');
    }

    await this.db.v1.User.DeleteComment(commentId, userId);
  }

  public async LikePost(postId: string, userId: string): Promise<{ isLiked: boolean; totalLikes: number }> {
    Logger.info('UserService.LikePost', { postId, userId });


    // Check if user already liked the post
    const existingLike = await this.db.v1.User.GetPostLike(postId, userId);
    if (existingLike) {
      throw new BadRequest('You have already liked this post');
    }

    // Add the like and increment totalLikes
    const totalLikes = await this.db.v1.User.LikePost(postId, userId);

    return {
      isLiked: true,
      totalLikes
    };
  }

  public async UnlikePost(postId: string, userId: string): Promise<{ isLiked: boolean; totalLikes: number }> {
    Logger.info('UserService.UnlikePost', { postId, userId });



    // Check if user has liked the post
    const existingLike = await this.db.v1.User.GetPostLike(postId, userId);
    if (!existingLike) {
      throw new BadRequest('You have not liked this post');
    }

    // Remove the like and decrement totalLikes
    const totalLikes = await this.db.v1.User.UnlikePost(postId, userId);

    return {
      isLiked: false,
      totalLikes
    };
  }
}
