import { Db } from '../../../../database/db';
import { AppError, BadRequest } from '../../../../helpers/errors';
import { Logger } from '../../../../helpers/logger';
import { Entities, Hash, stripeService } from '../../../../helpers';
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
      isVerified: user.isVerified || false,
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

    const { socialLinks } = updateData;
    if (socialLinks) {
      updateData.socialLinks = JSON.stringify(socialLinks);
    }

    if (updateData.email) {

      const existingUser = await this.db.v1.User.GetUser({ email: updateData.email });
      if (existingUser) {
        throw new BadRequest('User With this email already exist ');
      }

    }

    if (updateData.pageName) {

      const existingUser = await this.db.v1.User.GetUser({ pageName: updateData.pageName });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequest('User With this PageName already exist ');
      }

    }

    const updatedUser = await this.db.v1.User.UpdateUser(userId, updateData);

    if (!updatedUser) throw new BadRequest('User not found or update failed');

    // Sync link-in-bio profile data if profile exists
    try {
      await this.db.v1.LinkInBio.SyncUserProfileData(userId, updateData);
    } catch (error) {
      Logger.debug('Failed to sync link-in-bio profile', error);
      // Don't throw - sync failures shouldn't break user update
    }

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

    // Send password changed notification email (non-blocking)
    try {
      const { FrontEndLink } = await import('../../../../helpers/env');
      await this.emailService.SendPasswordChangedEmail(
        user.email,
        'Unknown', // IP address - can be added as parameter if needed
        `${FrontEndLink.FRONT_END_LINK}/support` || 'https://truefans.ng/support'
      );
    } catch (error) {
      Logger.error('Failed to send password changed email', error);
      // Don't fail password reset if email fails
    }
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
        tags: creator.tags,
        category: creator.category,
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

    const memeberships = await this.db.v1.User.GetMembershipsOfCreatorForUser(creatorId, currentUserId);
    const products = await this.db.v1.User.GetProductsByCreatorWithPurchaseStatus(creatorId, currentUserId);
    const events = await this.db.v1.User.GetEventsByCreator(creatorId, currentUserId);
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
      memberships: memeberships,
      recentPosts: recentPosts.map((post: any) => ({
        id: post.id,
        title: post.title,
        createdAt: post.createdAt,
        public: (post.accessType || 'free') === 'free',
        totalLikes: parseInt(post.totalLikes) || 0,
        totalComments: parseInt(post.totalComments) || 0,
        mediaFiles: post.mediaFiles || [],
      })),
      products: products,
      events: events,

    }
  }

  public async GetCreatorByPageName(pageName: string, currentUserId: string): Promise<UserModels.CreatorProfile | null | any> {
    Logger.info('UserService.GetCreatorByPageName', { pageName, currentUserId });

    const creator2 = await this.db.v1.User.GetCreatorByPageNameWithFollowStatus(pageName, currentUserId);

    if (!creator2) {
      throw new BadRequest('Creator not found');
    }

    const creator = await this.db.v1.User.GetCreatorByIdWithFollowStatus(creator2.id, currentUserId);
    const recentPosts = await this.db.v1.User.GetRecentPostsByCreator(creator.id);

    Logger.info("creator", creator);

    const memeberships = await this.db.v1.User.GetMembershipsOfCreatorForUser(creator.id, currentUserId);
    const products = await this.db.v1.User.GetProductsByCreatorWithPurchaseStatus(creator.id, currentUserId);
    const events = await this.db.v1.User.GetEventsByCreator(creator.id, currentUserId);
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
      memberships: memeberships,
      recentPosts: recentPosts.map((post: any) => ({
        id: post.id,
        title: post.title,
        createdAt: post.createdAt,
        public: (post.accessType || 'free') === 'free',
        totalLikes: parseInt(post.totalLikes) || 0,
        totalComments: parseInt(post.totalComments) || 0,
        mediaFiles: post.mediaFiles || [],
      })),
      products: products,
      events: events,

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
    const { mediaFiles, ...data } = body
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
  /**
   * Helper method to get platform fee from settings
   */
  private async getPlatformFee(): Promise<number> {
    try {
      const settings = await this.db.v1.Admin.GetSettings();
      if (!settings) {
        Logger.error('No settings found, using default platform fee of 0');
        return 0;
      }
      const platformFee = parseFloat(settings.platformFee) || 0;
      Logger.info('Platform fee retrieved from settings', {
        platformFee,
        settingsPlatformFee: settings.platformFee
      });
      return platformFee;
    } catch (error) {
      Logger.error('Failed to get platform fee from settings', error);
      return 0; // Default to 0 if there's an error
    }
  }

  /**
   * Helper method to calculate price with platform fee
   */
  private calculatePriceWithPlatformFee(originalPrice: number, platformFee: number): number {
    const feeAmount = (platformFee / 100) * originalPrice;
    const totalPrice = originalPrice + feeAmount;
    Logger.info('Price calculation with platform fee', {
      originalPrice,
      platformFee,
      feeAmount,
      totalPrice
    });
    return totalPrice;
  }

  public async CreateMembership(creatorId: string, body: any): Promise<string> {
    Logger.info('UserService.CreateMembership', { creatorId, body });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can create memberships.');
    }

    try {
      // Get platform fee from settings
      const platformFee = await this.getPlatformFee();
      Logger.info('UserService.CreateMembership - Platform fee', { platformFee });

      if (platformFee === 0) {
        Logger.error('UserService.CreateMembership - Platform fee is 0. No fee will be added to the price. Make sure settings have a platform fee configured.');
      }

      // Create Stripe product
      const stripeProduct = await stripeService.createProduct(
        `${creator.pageName} - ${body.name}`,
        body.description || `Membership subscription for ${creator.pageName}`
      );

      // Calculate price with platform fee for Stripe
      const originalPrice = parseFloat(body.price);
      const priceWithFee = this.calculatePriceWithPlatformFee(originalPrice, platformFee);
      const currency = body.currency?.toLowerCase() || 'ngn';

      Logger.info('UserService.CreateMembership - Price calculation', {
        originalPrice,
        platformFee,
        priceWithFee,
        feeAmount: priceWithFee - originalPrice
      });

      // Create Stripe price with the total amount (original price + platform fee)
      // Note: Stripe expects amount in smallest currency unit (kobo for NGN)
      // createPrice handles the conversion (amount * 100)
      const stripePrice = await stripeService.createPrice(
        stripeProduct.id,
        priceWithFee,
        currency
      );

      Logger.info('UserService.CreateMembership - Stripe price created', {
        stripePriceId: stripePrice.id,
        stripePriceAmount: stripePrice.unit_amount, // This is in kobo (smallest unit)
        stripePriceCurrency: stripePrice.currency,
        calculatedPriceWithFee: priceWithFee
      });

      // Store the original price in the database (what users see)
      const membership: Partial<Entities.Membership> = {
        creatorId,
        name: body.name,
        price: body.price, // Store original price for display
        currency: body.currency || 'NGN',
        description: body.description,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        platformFee: platformFee, // Store platform fee percentage
        priceWithFee: priceWithFee, // Store price with fee for reference
      };

      const id = await this.db.v1.User.CreateMembership(membership);
      Logger.info('UserService.CreateMembership success', {
        membershipId: id,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        originalPrice,
        priceWithFee
      });

      return id;
    } catch (error) {
      Logger.error('UserService.CreateMembership failed', error);
      throw new AppError(500, 'Failed to create membership with Stripe integration');
    }
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

  // Product CRUD methods with creator validation
  public async CreateProduct(creatorId: string, body: any): Promise<string> {
    Logger.info('UserService.CreateProduct', { creatorId, body });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can create products.');
    }

    try {
      // Get platform fee from settings
      const platformFee = await this.getPlatformFee();
      Logger.info('UserService.CreateProduct - Platform fee', { platformFee });

      if (platformFee === 0) {
        Logger.error('UserService.CreateProduct - Platform fee is 0. No fee will be added to the price. Make sure settings have a platform fee configured.');
      }

      // Create Stripe product
      const stripeProduct = await stripeService.createProduct(
        body.name,
        body.description || `Digital product: ${body.name}`
      );

      // Calculate price with platform fee for Stripe
      const originalPrice = parseFloat(body.price);
      const priceWithFee = this.calculatePriceWithPlatformFee(originalPrice, platformFee);
      const currency = 'ngn'; // Default to NGN for products

      Logger.info('UserService.CreateProduct - Price calculation', {
        originalPrice,
        platformFee,
        priceWithFee,
        feeAmount: priceWithFee - originalPrice
      });

      // Create Stripe price with the total amount (original price + platform fee)
      // Note: Stripe expects amount in smallest currency unit (kobo for NGN)
      // createOneTimePrice handles the conversion (amount * 100)
      const stripePrice = await stripeService.createOneTimePrice(
        stripeProduct.id,
        priceWithFee,
        currency
      );

      Logger.info('UserService.CreateProduct - Stripe price created', {
        stripePriceId: stripePrice.id,
        stripePriceAmount: stripePrice.unit_amount, // This is in kobo (smallest unit)
        stripePriceCurrency: stripePrice.currency,
        calculatedPriceWithFee: priceWithFee
      });

      // Store the original price in the database (what users see)
      const product: Partial<Entities.Product> = {
        creatorId,
        name: body.name,
        description: body.description,
        mediaUrl: body.mediaUrl,
        price: body.price, // Store original price for display
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        platformFee: platformFee, // Store platform fee percentage
        priceWithFee: priceWithFee, // Store price with fee for reference
      };

      const id = await this.db.v1.User.CreateProduct(product);
      Logger.info('UserService.CreateProduct success', {
        productId: id,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        originalPrice,
        priceWithFee
      });

      return id;
    } catch (error) {
      Logger.error('UserService.CreateProduct failed', error);
      throw new AppError(500, 'Failed to create product with Stripe integration');
    }
  }

  public async GetProductsByCreator(creatorId: string, validateCreator: boolean = true): Promise<Entities.Product[]> {
    Logger.info('UserService.GetProductsByCreator', { creatorId, validateCreator });

    // Check if user is a creator (only if validateCreator is true)
    if (validateCreator) {
      const creator = await this.db.v1.User.GetUser({ id: creatorId });
      if (!creator || !creator.pageName) {
        throw new BadRequest('You do not have permission for this action. Only creators can view products.');
      }
    }

    return await this.db.v1.User.GetProductsByCreator(creatorId);
  }

  public async GetProductById(productId: string): Promise<Entities.Product | null> {
    Logger.info('UserService.GetProductById', { productId });
    return await this.db.v1.User.GetProductById(productId);
  }

  public async UpdateProduct(productId: string, creatorId: string, body: any): Promise<Entities.Product | null> {
    Logger.info('UserService.UpdateProduct', { productId, creatorId, body });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can update products.');
    }

    // Check if product belongs to this creator
    const product = await this.db.v1.User.GetProductById(productId);
    if (!product) {
      throw new BadRequest('Product not found');
    }

    if (product.creatorId !== creatorId) {
      throw new BadRequest('You do not have permission to update this product.');
    }

    const updateData: Partial<Entities.Product> = {
      name: body.name,
      description: body.description,
      mediaUrl: body.mediaUrl,
      price: body.price,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof Entities.Product] === undefined) {
        delete updateData[key as keyof Entities.Product];
      }
    });

    // If price changed and product has Stripe integration, update Stripe price
    if (body.price && product.stripeProductId && parseFloat(body.price) !== parseFloat(product.price)) {
      try {
        Logger.info('UserService.UpdateProduct - Updating Stripe price', {
          productId,
          oldPrice: product.price,
          newPrice: body.price
        });

        // Get platform fee from settings
        const platformFee = await this.getPlatformFee();

        // Calculate price with platform fee for Stripe
        const originalPrice = parseFloat(body.price);
        const priceWithFee = this.calculatePriceWithPlatformFee(originalPrice, platformFee);

        Logger.info('UserService.UpdateProduct - Price calculation with platform fee', {
          originalPrice,
          platformFee,
          priceWithFee
        });

        // Create a new price in Stripe (we can't update existing prices) with platform fee included
        const newStripePrice = await stripeService.createOneTimePrice(
          product.stripeProductId,
          priceWithFee,
          'ngn'
        );

        // Update the product with the new Stripe price ID and platform fee info
        updateData.stripePriceId = newStripePrice.id;
        updateData.platformFee = platformFee;
        updateData.priceWithFee = priceWithFee;

        Logger.info('UserService.UpdateProduct - Stripe price updated', {
          newStripePriceId: newStripePrice.id,
          originalPrice,
          priceWithFee,
          platformFee
        });
      } catch (error) {
        Logger.error('UserService.UpdateProduct - Failed to update Stripe price', error);
        // Continue with update even if Stripe update fails
      }
    }

    // If name or description changed and product has Stripe integration, update Stripe product
    if (product.stripeProductId && (body.name || body.description)) {
      try {
        const stripe = stripeService.getStripeInstance();
        await stripe.products.update(product.stripeProductId, {
          name: body.name || product.name,
          description: body.description || product.description || undefined,
        });
        Logger.info('UserService.UpdateProduct - Stripe product updated', {
          stripeProductId: product.stripeProductId
        });
      } catch (error) {
        Logger.error('UserService.UpdateProduct - Failed to update Stripe product', error);
        // Continue with update even if Stripe update fails
      }
    }

    return await this.db.v1.User.UpdateProduct(productId, updateData);
  }

  public async DeleteProduct(productId: string, creatorId: string): Promise<void> {
    Logger.info('UserService.DeleteProduct', { productId, creatorId });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can delete products.');
    }

    // Check if product belongs to this creator
    const product = await this.db.v1.User.GetProductById(productId);
    if (!product) {
      throw new BadRequest('Product not found');
    }

    if (product.creatorId !== creatorId) {
      throw new BadRequest('You do not have permission to delete this product.');
    }

    await this.db.v1.User.DeleteProduct(productId);
  }

  // Event CRUD methods with creator validation
  public async CreateEvent(creatorId: string, body: any): Promise<string> {
    Logger.info('UserService.CreateEvent', { creatorId, body });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can create events.');
    }

    const event: Partial<Entities.Event> = {
      creatorId,
      name: body.name,
      description: body.description,
      mediaUrl: body.mediaUrl,
      eventDate: body.eventDate,
      liveStreamLink: body.liveStreamLink,
      isFree: body.isFree,
      memberShipId: body.memberShipId,
    };

    const id = await this.db.v1.User.CreateEvent(event);
    return id;
  }

  public async GetEventsByCreator(creatorId: string, currentUserId?: string): Promise<any[]> {
    Logger.info('UserService.GetEventsByCreator', { creatorId, currentUserId });

    // Check if user is a creator (only if validateCreator is true)
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can view events.');
    }

    return await this.db.v1.User.GetEventsByCreator(creatorId, currentUserId);
  }

  public async GetEventById(eventId: string, currentUserId?: string): Promise<any | null> {
    Logger.info('UserService.GetEventById', { eventId, currentUserId });
    const event = await this.db.v1.User.GetEventById(eventId, currentUserId);
    return event;
  }

  public async GetAllFutureEvents(currentUserId?: string): Promise<any[]> {
    Logger.info('UserService.GetAllFutureEvents', { currentUserId });
    return await this.db.v1.User.GetAllFutureEvents(currentUserId);
  }

  public async UpdateEvent(eventId: string, creatorId: string, body: any): Promise<Entities.Event | null> {
    Logger.info('UserService.UpdateEvent', { eventId, creatorId, body });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can update events.');
    }

    // Check if event belongs to this creator
    const event = await this.db.v1.User.GetEventById(eventId);
    if (!event) {
      throw new BadRequest('Event not found');
    }

    if (event.creatorId !== creatorId) {
      throw new BadRequest('You do not have permission to update this event.');
    }

    const updateData: Partial<Entities.Event> = {
      name: body.name,
      description: body.description,
      mediaUrl: body.mediaUrl,
      eventDate: body.eventDate,
      liveStreamLink: body.liveStreamLink,
      isFree: body.isFree,
      memberShipId: body.memberShipId,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof Entities.Event] === undefined) {
        delete updateData[key as keyof Entities.Event];
      }
    });

    return await this.db.v1.User.UpdateEvent(eventId, updateData);
  }

  public async DeleteEvent(eventId: string, creatorId: string): Promise<void> {
    Logger.info('UserService.DeleteEvent', { eventId, creatorId });

    // Check if user is a creator
    const creator = await this.db.v1.User.GetUser({ id: creatorId });
    if (!creator || !creator.pageName) {
      throw new BadRequest('You do not have permission for this action. Only creators can delete events.');
    }

    // Check if event belongs to this creator
    const event = await this.db.v1.User.GetEventById(eventId);
    if (!event) {
      throw new BadRequest('Event not found');
    }

    if (event.creatorId !== creatorId) {
      throw new BadRequest('You do not have permission to delete this event.');
    }

    await this.db.v1.User.DeleteEvent(eventId);
  }

  // Event Interest methods
  public async ToggleEventInterest(userId: string, eventId: string): Promise<{ action: 'interested' | 'not_interested'; isInterested: boolean }> {
    Logger.info('UserService.ToggleEventInterest', { userId, eventId });

    // Verify that the event exists
    const event = await this.db.v1.User.GetEventById(eventId);
    if (!event) {
      throw new BadRequest('Event not found');
    }

    // Prevent creator from showing interest in their own event
    if (event.creatorId === userId) {
      throw new BadRequest('You cannot show interest in your own event.');
    }

    const result = await this.db.v1.User.ToggleEventInterest(userId, eventId);

    // Create notification for creator when someone shows interest
    if (result.action === 'interested') {
      try {
        const interestedUser = await this.db.v1.User.GetUser({ id: userId });
        const creator = await this.db.v1.User.GetUser({ id: event.creatorId });

        const notification: Partial<Entities.Notification> = {
          userId: event.creatorId, // Creator receives the notification
          title: 'New Event Interest!',
          message: `${interestedUser?.name || interestedUser?.creatorName || 'Someone'} is interested in your event "${event.name}"`,
          redirectUrl: `/event/${eventId}`,
          fromUserId: userId,
          type: 'creator',
          isRead: false,
        };

        await this.CreateNotification(notification);

        Logger.info('UserService.ToggleEventInterest - Creator notification created', {
          creatorId: event.creatorId,
          userId: userId,
          eventId: eventId
        });
      } catch (error) {
        // Log error but don't fail the interest action
        Logger.error('UserService.ToggleEventInterest - Failed to create creator notification', error);
      }
    }

    return result;
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
    const verificationLink = `${FrontEndLink.FRONT_END_LINK}verify?token=${token}`;

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

  // Stripe checkout session for subscriptions
  public async CreateCheckoutSession(
    userId: string,
    membershipId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    Logger.info('UserService.CreateCheckoutSession', { userId, membershipId, successUrl, cancelUrl });

    // Get membership details
    const membership = await this.db.v1.User.GetMembershipById(membershipId);
    if (!membership) {
      throw new BadRequest('Membership not found');
    }

    if (!membership.stripePriceId) {
      throw new BadRequest('Membership does not have Stripe integration configured');
    }

    // Get user details for customer email
    const user = await this.db.v1.User.GetUser({ id: userId });
    if (!user) {
      throw new BadRequest('User not found');
    }

    // Check if user is already subscribed to this creator
    const existingSubscription = await this.db.v1.User.GetSubscriptionByUserAndCreator(userId, membership.creatorId);
    if (existingSubscription && existingSubscription.isActive) {
      throw new BadRequest('You are already subscribed to this creator');
    }

    try {
      // Create Stripe checkout session
      const session = await stripeService.createCheckoutSession(
        membership.stripePriceId,
        successUrl,
        cancelUrl,
        user.email,
        {
          userId,
          membershipId,
          creatorId: membership.creatorId,
        }
      );

      Logger.info('UserService.CreateCheckoutSession success', { sessionId: session.id });

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      Logger.error('UserService.CreateCheckoutSession failed', error);
      throw new AppError(500, 'Failed to create checkout session');
    }
  }

  // Stripe checkout session for product purchases
  public async CreateProductCheckoutSession(
    userId: string,
    productId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    Logger.info('UserService.CreateProductCheckoutSession', { userId, productId, successUrl, cancelUrl });

    // Get product details
    const product = await this.db.v1.User.GetProductById(productId);
    if (!product) {
      throw new BadRequest('Product not found');
    }

    if (!product.stripePriceId) {
      throw new BadRequest('Product does not have Stripe integration configured');
    }

    // Get user details for customer email
    const user = await this.db.v1.User.GetUser({ id: userId });
    if (!user) {
      throw new BadRequest('User not found');
    }

    try {
      // Create Stripe checkout session for one-time payment
      const session = await stripeService.createPaymentCheckoutSession(
        product.stripePriceId,
        successUrl,
        cancelUrl,
        user.email,
        {
          userId,
          productId,
          creatorId: product.creatorId,
        }
      );

      Logger.info('UserService.CreateProductCheckoutSession success', { sessionId: session.id });

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      Logger.error('UserService.CreateProductCheckoutSession failed', error);
      throw new AppError(500, 'Failed to create product checkout session');
    }
  }

  // Stripe webhook handlers
  public async CreateSubscriptionFromStripe(subscriptionData: {
    subscriberId: string;
    creatorId: string;
    membershipId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    subscriptionStatus: string;
    startedAt: Date;
  }): Promise<void> {
    Logger.info('UserService.CreateSubscriptionFromStripe', subscriptionData);

    try {
      const subscription: Partial<Entities.Subscription> = {
        subscriberId: subscriptionData.subscriberId,
        creatorId: subscriptionData.creatorId,
        membershipId: subscriptionData.membershipId,
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
        stripeCustomerId: subscriptionData.stripeCustomerId,
        subscriptionStatus: subscriptionData.subscriptionStatus as Entities.Subscription['subscriptionStatus'],
        isActive: subscriptionData.subscriptionStatus === 'active',
        startedAt: subscriptionData.startedAt.toISOString(),
      };

      await this.db.v1.User.CreateSubscription(subscription);
      Logger.info('Subscription created from Stripe webhook', {
        subscriptionId: subscriptionData.stripeSubscriptionId
      });
    } catch (error) {
      Logger.error('UserService.CreateSubscriptionFromStripe failed', error);
      throw error;
    }
  }

  public async UpdateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string,
    canceledAt?: Date
  ): Promise<void> {
    Logger.info('UserService.UpdateSubscriptionStatus', {
      stripeSubscriptionId,
      status,
      canceledAt
    });

    try {
      const updateData: any = {
        subscriptionStatus: status,
        isActive: status === 'active',
        updatedAt: new Date(),
      };

      if (canceledAt) {
        updateData.canceledAt = canceledAt;
        updateData.isActive = false;
      }

      await this.db.v1.User.UpdateSubscriptionByStripeId(stripeSubscriptionId, updateData);
      Logger.info('Subscription status updated', { stripeSubscriptionId, status });
    } catch (error) {
      Logger.error('UserService.UpdateSubscriptionStatus failed', error);
      throw error;
    }
  }

  public async CreateTransactionFromInvoice(
    invoice: any,
    stripeSubscriptionId: string
  ): Promise<void> {
    Logger.info('UserService.CreateTransactionFromInvoice', {
      invoiceId: invoice.id,
      stripeSubscriptionId
    });

    try {
      // Get subscription from database
      const subscription = await this.db.v1.User.GetSubscriptionByStripeId(stripeSubscriptionId);

      if (!subscription) {
        Logger.error('Subscription not found for Stripe subscription ID', { stripeSubscriptionId });
        throw new AppError(404, 'Subscription not found');
      }

      // Extract invoice data first
      const amount = invoice.amount_paid / 100; // Convert from cents to dollars
      const currency = invoice.currency.toUpperCase();
      const fee = invoice.application_fee_amount ? invoice.application_fee_amount / 100 : null;
      const netAmount = invoice.amount_paid ? (invoice.amount_paid - (invoice.application_fee_amount || 0)) / 100 : null;

      // Get membership details to retrieve platform fee information
      const membership = await this.db.v1.User.GetMembershipById(subscription.membershipId);
      if (!membership) {
        Logger.error('Membership not found for subscription', { membershipId: subscription.membershipId });
      }

      const originalPrice = membership ? parseFloat(membership.price) : amount;
      const platformFee = membership?.platformFee || 0;
      const priceWithFee = membership?.priceWithFee || amount;

      // Get payment intent and charge IDs
      const paymentIntentId = typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id || null;

      const chargeId = invoice.charge as string || null;
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id || null;

      // Get billing period from invoice
      const billingPeriodStart = invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : null;
      const billingPeriodEnd = invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : null;

      // Get balance status from Stripe (non-blocking - defaults to 'incoming' if fails)
      let balanceStatus: 'incoming' | 'available' = 'incoming';
      try {
        const { stripeService } = await import('../../../../helpers/stripe');
        const paymentDate = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date();
        balanceStatus = await stripeService.getPaymentBalanceStatus(
          paymentIntentId || undefined,
          chargeId || undefined,
          paymentDate
        );
      } catch (error) {
        Logger.error('Failed to get balance status from Stripe, defaulting to incoming', error);
        // Default to incoming if Stripe API call fails
      }

      // Create transaction record
      const transaction: Partial<Entities.Transaction> = {
        subscriptionId: subscription.id,
        subscriberId: subscription.subscriberId,
        creatorId: subscription.creatorId,
        stripePaymentIntentId: paymentIntentId || undefined,
        stripeChargeId: chargeId || undefined,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: customerId || undefined,
        transactionType: 'subscription',
        status: invoice.paid ? 'succeeded' : 'failed',
        amount,
        currency,
        fee: fee ?? undefined,
        netAmount: netAmount ?? undefined,
        platformFee: platformFee,
        originalPrice: originalPrice,
        priceWithFee: priceWithFee,
        balanceStatus: balanceStatus as any, // Add balance status
        billingPeriodStart: billingPeriodStart ? billingPeriodStart.toISOString() : undefined,
        billingPeriodEnd: billingPeriodEnd ? billingPeriodEnd.toISOString() : undefined,
        processedAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : new Date().toISOString(),
        description: invoice.description || `Subscription payment for invoice ${invoice.number || invoice.id}`,
        receiptUrl: invoice.hosted_invoice_url || undefined,
        metadata: {
          invoiceNumber: invoice.number,
          invoiceStatus: invoice.status,
          attemptCount: invoice.attempt_count,
        },
      };

      await this.db.v1.User.CreateTransaction(transaction);
      Logger.info('Transaction created from invoice', {
        transactionId: invoice.id,
        subscriptionId: subscription.id
      });
    } catch (error) {
      Logger.error('UserService.CreateTransactionFromInvoice failed', error);
      throw error;
    }
  }

  // Product Purchase webhook handlers
  public async CreateProductPurchaseFromStripe(purchaseData: {
    userId: string;
    productId: string;
    creatorId: string;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    stripeCustomerId?: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
  }): Promise<void> {
    Logger.info('UserService.CreateProductPurchaseFromStripe', purchaseData);

    try {
      // Check if purchase already exists
      const existingPurchase = await this.db.v1.User.GetProductPurchaseByCheckoutSession(
        purchaseData.stripeCheckoutSessionId
      );

      // Get product details to retrieve platform fee information
      const product = await this.db.v1.User.GetProductById(purchaseData.productId);
      if (!product) {
        Logger.error('Product not found when creating purchase', { productId: purchaseData.productId });
      }

      const originalPrice = product ? parseFloat(product.price) : purchaseData.amount;
      const platformFee = product?.platformFee || 0;
      const priceWithFee = product?.priceWithFee || purchaseData.amount;

      if (existingPurchase) {
        Logger.info('Product purchase already exists, updating', {
          purchaseId: existingPurchase.id
        });

        await this.db.v1.User.UpdateProductPurchase(existingPurchase.id, {
          status: purchaseData.status,
          stripePaymentIntentId: purchaseData.stripePaymentIntentId,
          stripeChargeId: purchaseData.stripeChargeId,
          stripeCustomerId: purchaseData.stripeCustomerId,
          purchasedAt: purchaseData.status === 'completed' ? new Date().toISOString() : undefined,
          platformFee: platformFee,
          originalPrice: originalPrice,
          priceWithFee: priceWithFee,
        });
        return;
      }

      const purchase: Partial<Entities.ProductPurchase> = {
        userId: purchaseData.userId,
        productId: purchaseData.productId,
        creatorId: purchaseData.creatorId,
        stripeCheckoutSessionId: purchaseData.stripeCheckoutSessionId,
        stripePaymentIntentId: purchaseData.stripePaymentIntentId,
        stripeChargeId: purchaseData.stripeChargeId,
        stripeCustomerId: purchaseData.stripeCustomerId,
        amount: purchaseData.amount,
        currency: purchaseData.currency,
        status: purchaseData.status,
        purchasedAt: purchaseData.status === 'completed' ? new Date().toISOString() : undefined,
        platformFee: platformFee,
        originalPrice: originalPrice,
        priceWithFee: priceWithFee,
      };

      await this.db.v1.User.CreateProductPurchase(purchase);
      Logger.info('Product purchase created from Stripe webhook', {
        purchaseId: purchaseData.productId
      });
    } catch (error) {
      Logger.error('UserService.CreateProductPurchaseFromStripe failed', error);
      throw error;
    }
  }

  public async CreateTransactionFromProductPurchase(transactionData: {
    userId: string;
    productId: string;
    creatorId: string;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    stripeCustomerId?: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'pending' | 'canceled' | 'refunded';
  }): Promise<void> {
    Logger.info('UserService.CreateTransactionFromProductPurchase', transactionData);

    try {
      // Get product details to retrieve platform fee information
      const product = await this.db.v1.User.GetProductById(transactionData.productId);
      if (!product) {
        Logger.error('Product not found when creating transaction', { productId: transactionData.productId });
      }

      const originalPrice = product ? parseFloat(product.price) : transactionData.amount;
      const platformFee = product?.platformFee || 0;
      const priceWithFee = product?.priceWithFee || transactionData.amount;

      // Calculate fee and net amount (Stripe fee is approximately 2.9% + 30 cents)
      const fee = transactionData.amount * 0.029 + 0.30;
      const netAmount = transactionData.amount - fee;

      // Get balance status from Stripe (non-blocking - defaults to 'incoming' if fails)
      let balanceStatus: 'incoming' | 'available' = 'incoming';
      try {
        const { stripeService } = await import('../../../../helpers/stripe');
        balanceStatus = await stripeService.getPaymentBalanceStatus(
          transactionData.stripePaymentIntentId,
          transactionData.stripeChargeId,
          new Date()
        );
      } catch (error) {
        Logger.info('Failed to get balance status from Stripe, defaulting to incoming', error);
        // Default to incoming if Stripe API call fails
      }

      const transaction: Partial<Entities.Transaction> = {
        productId: transactionData.productId,
        subscriberId: transactionData.userId, // Using subscriberId field for buyer
        creatorId: transactionData.creatorId,
        stripePaymentIntentId: transactionData.stripePaymentIntentId,
        stripeChargeId: transactionData.stripeChargeId,
        stripeCustomerId: transactionData.stripeCustomerId,
        transactionType: 'payment',
        status: transactionData.status,
        amount: transactionData.amount,
        currency: transactionData.currency,
        fee: fee,
        netAmount: netAmount,
        platformFee: platformFee,
        originalPrice: originalPrice,
        priceWithFee: priceWithFee,
        balanceStatus: balanceStatus as any, // Add balance status
        processedAt: transactionData.status === 'succeeded' ? new Date().toISOString() : undefined,
        description: `Product purchase transaction`,
      };

      await this.db.v1.User.CreateTransaction(transaction);
      Logger.info('Transaction created from product purchase', {
        productId: transactionData.productId
      });
    } catch (error) {
      Logger.error('UserService.CreateTransactionFromProductPurchase failed', error);
      throw error;
    }
  }

  // Check if user has purchased a product
  public async HasUserPurchasedProduct(userId: string, productId: string): Promise<boolean> {
    Logger.info('UserService.HasUserPurchasedProduct', { userId, productId });

    try {
      const purchase = await this.db.v1.User.GetProductPurchaseByUserAndProduct(userId, productId);
      return purchase !== null && purchase.status === 'completed';
    } catch (error) {
      Logger.error('UserService.HasUserPurchasedProduct failed', error);
      return false;
    }
  }

  // Payouts and Wallet methods
  public async GetCreatorTransactions(creatorId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<{
    transactions: Entities.Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      Logger.info('UserService.GetCreatorTransactions', { creatorId, filters });

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;

      const { transactions, total } = await this.db.v1.User.GetCreatorTransactions(creatorId, {
        page,
        limit,
        status: filters?.status,
        type: filters?.type,
      });

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      Logger.error('UserService.GetCreatorTransactions failed', error);
      throw error;
    }
  }

  public async GetCreatorWalletBalance(creatorId: string): Promise<{
    totalBalance: number;
    availableBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    totalWithdrawals: number;
    thisMonthEarnings: number;
  }> {
    try {
      Logger.info('UserService.GetCreatorWalletBalance', { creatorId });

      const balance = await this.db.v1.User.GetCreatorWalletBalance(creatorId);

      return balance;
    } catch (error) {
      Logger.error('UserService.GetCreatorWalletBalance failed', error);
      throw error;
    }
  }

  /**
   * Update transaction balance status when funds become available
   */
  public async UpdateTransactionBalanceStatus(
    paymentIntentId: string,
    balanceStatus: 'incoming' | 'available'
  ): Promise<void> {
    try {
      Logger.info('UserService.UpdateTransactionBalanceStatus', { paymentIntentId, balanceStatus });

      await this.db.v1.User.UpdateTransactionBalanceStatusByStripePaymentIntent(
        paymentIntentId,
        balanceStatus
      );

      Logger.info('Transaction balance status updated successfully', { paymentIntentId, balanceStatus });
    } catch (error) {
      Logger.error('UserService.UpdateTransactionBalanceStatus failed', error);
      throw error;
    }
  }
}
