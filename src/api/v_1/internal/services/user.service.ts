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
import { generateRandomToken } from '../../../../helpers/otp';
import moment from 'moment';
import { EmailService } from '../../../../helpers/email';
import { FrontEndLink } from '../../../../helpers/env';

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
      bio: user.bio || null,
      profilePhoto: user.profilePhoto || null,
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

    if(updateData.email) {

      const existingUser = await this.db.v1.User.GetUser({ email: updateData.email });
      if(existingUser) {
        throw new BadRequest('User With this email already exist ');
      }

    }

    if(updateData.pageName) {

      const existingUser = await this.db.v1.User.GetUser({ pageName: updateData.pageName });
      if(existingUser) {
        throw new BadRequest('User With this PageName already exist ');
      }

    }

    const updatedUser = await this.db.v1.User.UpdateUser(userId, updateData);

    if (!updatedUser) throw new BadRequest('User not found or update failed');

  }

  public async ResetPassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    Logger.info('UserService.ResetPassword', { userId });

    // Get the user
    const user = await this.db.v1.User.GetUser({ id: userId });

    if (!user) throw new BadRequest('User not found');

    if (!user.password) throw new BadRequest('No password found for user. Please use forgot password instead.');

    // Verify the old password
    const isCorrectPassword = await Hash.verifyPassword(oldPassword, user.password);

    if (!isCorrectPassword) throw new BadRequest('Invalid old password');

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the password
    await this.db.v1.User.UpdateUser(userId, { password: hashedPassword });
  }

  public async GetAllCreators(currentUserId?: string, page: number = 1, limit: number = 10): Promise<{
    creators: UserModels.CreatorProfile[];
    pagination: {
      currentPage: number;
      limit: number;
      totalCreators: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    Logger.info('UserService.GetAllCreators', { currentUserId, page, limit });

    const [creators, totalCreators] = await Promise.all([
      this.db.v1.User.GetAllCreatorsWithFollowStatus(currentUserId, page, limit),
      this.db.v1.User.GetTotalCreatorsCount(),
    ]);

    if (!creators) {
      return {
        creators: [],
        pagination: {
          currentPage: page,
          limit,
          totalCreators: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    const totalPages = Math.ceil(totalCreators / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      creators: creators.map((creator: any) => ({
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
        tags: creator.tags ,
        category: creator.category ,
        subscribersCount: parseInt(creator.subscribersCount) || 0,
      })),
      pagination: {
        currentPage: page,
        limit,
        totalCreators,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  public async GetCreatorById(creatorId: string, currentUserId: string): Promise<UserModels.CreatorProfile | null | any> {
    Logger.info('UserService.GetCreatorById', { creatorId, currentUserId });

    const creator = await this.db.v1.User.GetCreatorByIdWithFollowStatus(creatorId, currentUserId);
    const recentPosts = await this.db.v1.User.GetRecentPostsByCreator(creatorId);

    Logger.info("creator", creator);

    const memeberships =  await this.db.v1.User.GetMembershipsOfCreatorForUser(creatorId , currentUserId);

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
      isSubscribed: creator.isSubscriber,
      createdAt: creator.createdAt,
      updatedAt: creator.updatedAt,
      followersCount: parseInt(creator.followersCount) || 0,
      subscribersCount: parseInt(creator.subscribersCount),
      category: creator.category || 'music',
      totalPosts: recentPosts.length,
      memberships:memeberships,
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
    const followersCount = await this.db.v1.User.GetTotalFollowers(creator.id);
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
      followersCount: followersCount || 0,
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

    const result = await this.db.v1.User.ToggleFollowUser(userId, followerId);

    // Create notification for creator when someone follows them
    if (result.action === 'followed') {
      try {
        const follower = await this.db.v1.User.GetUser({ id: followerId });
        
        const notification: Partial<Entities.Notification> = {
          userId: userId, // Creator receives the notification
          title: 'New Follower!',
          message: `${follower?.name || follower?.creatorName || 'Someone'} started following you`,
          redirectUrl: `/creator/${creator.pageName}`,
          fromUserId: followerId,
          type: 'creator',
          isRead: false,
        };
        
        await this.CreateNotification(notification);
        
        Logger.info('UserService.ToggleFollowCreator - Creator notification created', { 
          creatorId: userId, 
          followerId: followerId 
        });
      } catch (error) {
        // Log error but don't fail the follow action
        Logger.error('UserService.ToggleFollowCreator - Failed to create creator notification', error);
      }
    }

    return result;
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

    // Create notifications for all subscribers
    try {
      const subscribers = await this.db.v1.User.GetSubscriptionsByCreatorId(creatorId);
      
      // Create notifications for each subscriber
      const notificationPromises = subscribers.map(async (subscriber) => {
        const notification: Partial<Entities.Notification> = {
          userId: subscriber.subscriberId,
          title: `New Post from ${creator.name || creator.creatorName}`,
          message: `${creator.name || creator.creatorName} just posted "${body.title}"`,
          redirectUrl: `/post/${id}`,
          fromUserId: creatorId,
          type: 'member',
          isRead: false,
        };
        
        return this.CreateNotification(notification);
      });

      // Execute all notification creations in parallel
      await Promise.all(notificationPromises);
      
      Logger.info('UserService.CreatePost - Notifications created', { 
        creatorId, 
        postId: id, 
        subscriberCount: subscribers.length 
      });
    } catch (error) {
      // Log error but don't fail the post creation
      Logger.error('UserService.CreatePost - Failed to create notifications', error);
    }

    return id;
  }

  public async UpdatePost(postId: string, body: PostModel.UpdatePostBody): Promise<Entities.Post | null> {
    Logger.info('UserService.UpdatePost', { postId, body: { ...body, content: '[omitted]' } });
    const {mediaFiles , ...data} = body
    const updated = await this.db.v1.User.UpdatePost(postId, data as Partial<Entities.Post>);
    if (mediaFiles) {
      const mediaFiles2 = mediaFiles.map((m) => ({ type: m.type, url: m.url, name: m.name, size: m.size }));
      await this.db.v1.User.ReplacePostMedia(postId, mediaFiles2);
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
    const paidPosts = await this.db.v1.User.GetAllPaidPostsByMembershipCreators(userId, page, limit);

// 2. Posts by followed creators
    const followedPosts = await this.db.v1.User.GetAllPostsByFollowedCreator(userId, page, limit);

// 3. Free Posts By Other Creators 
    const publicPosts = await this.db.v1.User.GetPublicPostsByOtherCreators(userId, page, limit);

    // Combine posts from both sources
    
    // Sort by creation date (most recent first)
    paidPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    followedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    publicPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const allPosts = [...paidPosts, ...followedPosts, ...publicPosts];
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
      isLiked: r.isLiked || false,
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

  async GetAllMyPosts(userId: string, page: number = 1, limit: number = 10): Promise<{
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
    Logger.info('UserService.GetAllMyPosts', { userId, page, limit });

    const posts = await this.db.v1.User.GetAllMyPosts(userId, page, limit);
    const totalPosts = posts.length;
    const totalPages = Math.ceil(totalPosts / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
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

  public async GetSuggestedCreators(userId: string, limit: number = 5): Promise<UserModels.CreatorProfile[]> {
    Logger.info('UserService.GetSuggestedCreators', { userId, limit });

    const creators = await this.db.v1.User.GetSuggestedCreators(userId, limit);

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
      isFollowing: false, // Since these are suggested creators, user is not following them
      followersCount: parseInt(creator.followersCount) || 0,
      tags: creator.tags || ['music', 'videos', 'entertainment'],
      category: creator.category || 'music',
      subscribersCount: parseInt(creator.subscribersCount) || 0,
      totalPosts: parseInt(creator.totalPosts) || 0,
    }));
  }

  // Subscription Methods
  public async SubscribeToCreator(userId: string, membershipId: string): Promise<{ subscriptionId: string; message: string }> {
    Logger.info('UserService.SubscribeToCreator', { userId, membershipId });

    // Get membership details
    const membership = await this.db.v1.User.GetMembershipById(membershipId);
    if (!membership) {
      throw new BadRequest('Membership not found');
    }

    // Check if user is trying to subscribe to themselves
    if (membership.creatorId === userId) {
      throw new BadRequest('Cannot subscribe to your own content');
    }

    // Check if user already has an active subscription to this creator
    const existingSubscription = await this.db.v1.User.CheckExistingSubscription(userId, membership.creatorId);
    if (existingSubscription) {
      throw new BadRequest('You already have an active subscription to this creator');
    }

    // Get subscriber details for notification
    const subscriber = await this.db.v1.User.GetUser({ id: userId });

    // Create subscription
    const subscriptionData: Partial<Entities.Subscription> = {
      subscriberId: userId,
      creatorId: membership.creatorId,
      membershipId: membershipId,
      subscriptionStatus: 'active',
      isActive: true,
      startedAt: new Date().toISOString(),
    };

    const subscriptionId = await this.db.v1.User.CreateSubscription(subscriptionData);

    // Create notification for creator
    try {
      const notification: Partial<Entities.Notification> = {
        userId: membership.creatorId,
        title: 'New Subscriber!',
        message: `${subscriber?.name || subscriber?.creatorName || 'Someone'} subscribed to your ${membership.name} membership`,
        redirectUrl: `/insights`,
        fromUserId: userId,
        type: 'creator',
        isRead: false,
      };
      
      await this.CreateNotification(notification);
      
      Logger.info('UserService.SubscribeToCreator - Creator notification created', { 
        creatorId: membership.creatorId, 
        subscriberId: userId,
        subscriptionId 
      });
    } catch (error) {
      // Log error but don't fail the subscription
      Logger.error('UserService.SubscribeToCreator - Failed to create creator notification', error);
    }

    return {
      subscriptionId,
      message: 'Successfully subscribed to creator'
    };
  }

  public async GetUserSubscriptions(userId: string): Promise<Entities.Subscription[]> {
    Logger.info('UserService.GetUserSubscriptions', { userId });

    const subscriptions = await this.db.v1.User.GetSubscriptionsBySubscriberId(userId);
    return subscriptions;
  }

  public async GetCreatorSubscribers(creatorId: string): Promise<Entities.Subscription[]> {
    Logger.info('UserService.GetCreatorSubscribers', { creatorId });

    const subscriptions = await this.db.v1.User.GetSubscriptionsByCreatorId(creatorId);
    return subscriptions;
  }

  public async CancelSubscription(userId: string, subscriptionId: string, reason?: string): Promise<{ message: string }> {
    Logger.info('UserService.CancelSubscription', { userId, subscriptionId, reason });

    // Get subscription to verify ownership
    const subscription = await this.db.v1.User.GetSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new BadRequest('Subscription not found');
    }

    if (subscription.subscriberId !== userId) {
      throw new BadRequest('You can only cancel your own subscriptions');
    }

    if (subscription.subscriptionStatus === 'canceled') {
      throw new BadRequest('Subscription is already canceled');
    }

    // Update subscription status
    await this.db.v1.User.UpdateSubscriptionStatus(subscriptionId, 'canceled', reason);

    return {
      message: 'Subscription canceled successfully'
    };
  }

  public async UnSubscribeToCreator(userId: string, creatorId: string): Promise<{ message: string }> {
    Logger.info('UserService.UnSubscribeToCreator', { userId, creatorId });

    // Check if user has an active subscription to this creator
    const existingSubscription = await this.db.v1.User.CheckExistingSubscription(userId, creatorId);
    if (!existingSubscription) {
      throw new BadRequest('No active subscription found for this creator');
    }

    // Delete the subscription
    await this.db.v1.User.DeleteSubscription(existingSubscription.id);

    return {
      message: 'Successfully unsubscribed from creator'
    };
  }

  // Insights Methods
  public async GetCreatorInsights(creatorId: string): Promise<{
    totalSubscribers: number;
    activeSubscribers: number;
    totalRevenue: number;
    postsThisMonth: number;
    freePosts: number;
    paidPosts: number;
    recentTransactions: any[];
  }> {
    Logger.info('UserService.GetCreatorInsights', { creatorId });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can view insights.');
    }

    // Get all insights data in a single optimized query
    return await this.db.v1.User.GetCreatorInsights(creatorId);
  }

  // Notification Methods
  public async GetAllNotifications(userId: string, page = 1, limit = 20, type?: 'member' | 'creator'): Promise<{
    notifications: Entities.Notification[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    Logger.info('UserService.GetAllNotifications', { userId, page, limit, type });

    return await this.db.v1.User.GetAllNotifications(userId, page, limit, type);
  }

  public async MarkNotificationAsRead(notificationId: string, userId: string): Promise<Entities.Notification> {
    Logger.info('UserService.MarkNotificationAsRead', { notificationId, userId });

    return await this.db.v1.User.MarkNotificationAsRead(notificationId, userId);
  }

  public async MarkAllNotificationsAsRead(userId: string): Promise<{ updatedCount: number }> {
    Logger.info('UserService.MarkAllNotificationsAsRead', { userId });

    return await this.db.v1.User.MarkAllNotificationsAsRead(userId);
  }

  public async GetUnreadNotificationCount(userId: string): Promise<number> {
    Logger.info('UserService.GetUnreadNotificationCount', { userId });

    return await this.db.v1.User.GetUnreadCount(userId);
  }

  public async CreateNotification(notification: Partial<Entities.Notification>): Promise<string> {
    Logger.info('UserService.CreateNotification', { notification });

    return await this.db.v1.User.CreateNotification(notification);
  }

  // Group Invites methods
  public async CreateGroupInvite(creatorId: string, groupInviteData: { groupName: string; platform: string; link: string }): Promise<any> {
    Logger.info('UserService.CreateGroupInvite', { creatorId, groupInviteData });

    const groupInvite: Partial<Entities.GroupInvite> = {
      creatorId,
      groupName: groupInviteData.groupName,
      platform: groupInviteData.platform,
      link: groupInviteData.link,
    };

    const groupInviteId = await this.db.v1.User.CreateGroupInvite(groupInvite);

    
    return groupInviteId;
  }

  public async GetGroupInvitesByCreatorId(creatorId: string): Promise<Entities.GroupInvite[]> {
    Logger.info('UserService.GetGroupInvitesByCreatorId', { creatorId });

    return await this.db.v1.User.GetGroupInvitesByCreatorId(creatorId);
  }

  public async GetGroupInviteById(id: string): Promise<Entities.GroupInvite> {
    Logger.info('UserService.GetGroupInviteById', { id });

    const groupInvite = await this.db.v1.User.GetGroupInviteById(id);

    if (!groupInvite) {
      throw new BadRequest('Group invite not found');
    }

    return groupInvite;
  }

  public async UpdateGroupInvite(id: string, creatorId: string, updateData: Partial<Entities.GroupInvite>): Promise<Entities.GroupInvite> {
    Logger.info('UserService.UpdateGroupInvite', { id, creatorId, updateData });

    // First verify the group invite belongs to the creator
    const existingGroupInvite = await this.db.v1.User.GetGroupInviteById(id);
    
    if (!existingGroupInvite) {
      throw new BadRequest('Group invite not found');
    }

    if (existingGroupInvite.creatorId !== creatorId) {
      throw new BadRequest('You can only update your own group invites');
    }

    const updatedGroupInvite = await this.db.v1.User.UpdateGroupInvite(id, updateData);

    if (!updatedGroupInvite) {
      throw new BadRequest('Failed to update group invite');
    }

    return updatedGroupInvite;
  }

  public async DeleteGroupInvite(id: string, creatorId: string): Promise<void> {
    Logger.info('UserService.DeleteGroupInvite', { id, creatorId });

    // First verify the group invite belongs to the creator
    const existingGroupInvite = await this.db.v1.User.GetGroupInviteById(id);
    
    if (!existingGroupInvite) {
      throw new BadRequest('Group invite not found');
    }

    if (existingGroupInvite.creatorId !== creatorId) {
      throw new BadRequest('You can only delete your own group invites');
    }

    await this.db.v1.User.DeleteGroupInvite(id);
  }

  // Verification methods
  async SendVerificationEmail(userId: string): Promise<void> {
    Logger.info('UserService.SendVerificationEmail', { userId });

    const user = await this.db.v1.User.GetUser({ id: userId });

    if (!user) {
      throw new AppError(400, 'User not found');
    }

    if (user.isVerified) {
      throw new AppError(400, 'User is already verified');
    }

    // Generate verification token
    const token = generateRandomToken();

    // Store verification token
    await this.db.v1.User.StoreVerificationToken({ userId: user.id, token });

    // Create verification link
    const verificationLink = `${FrontEndLink.FRONT_END_LINK}/verify?token=${token}`;

    // Send verification email
    await this.emailService.SendVerificationEmail(user.email, verificationLink);
  }

  async VerifyUser(token: string, userId: string): Promise<void> {
    Logger.info('UserService.VerifyUser', { token, userId });

    // Get verification by token
    const verification = await this.db.v1.User.GetVerificationByToken(token);

    if (!verification) {
      throw new AppError(400, 'Invalid or expired verification token');
    }

    // Verify that the token belongs to the authenticated user
    if (verification.userId !== userId) {
      throw new AppError(403, 'This verification token does not belong to you');
    }

    // Mark user as verified
    await this.db.v1.User.UpdateUser(verification.userId, { isVerified: true });

    // Delete the verification token after successful verification
    await this.db.v1.User.DeleteVerificationToken(token);
  }
}
