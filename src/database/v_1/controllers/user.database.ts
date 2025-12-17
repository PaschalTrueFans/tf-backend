/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { Entities } from '../../../helpers';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';
import { DatabaseErrors } from '../../../helpers/contants';
import { UserModel } from '../../models/User';
import { PostModel, CommentModel, LikeModel } from '../../models/Post';
import { CategoryModel, FollowerModel, MembershipModel, SubscriptionModel, ProductModel, EventModel, ProductPurchaseModel, TransactionModel, GroupInviteModel, VerificationTokenModel, NotificationModel } from '../../models/Other';

export class UserDatabase {
  private logger: typeof Logger;

  public constructor(args: any) {
    this.logger = Logger;
  }

  async GetUsersWithFilters(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'creator' | 'member';
    isBlocked?: boolean;
  }): Promise<{ users: Entities.User[]; total: number }> {
    const { page = 1, limit = 10, search, role, isBlocked } = params;
    this.logger.info('Db.GetUsersWithFilters', { page, limit, search, role, isBlocked });

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role === 'creator') {
      query.pageName = { $exists: true, $ne: null };
    } else if (role === 'member') {
      query.pageName = { $exists: false }; // simplified logic
    }

    if (isBlocked) {
      query.isBlocked = true;
    }

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      UserModel.countDocuments(query),
    ]);

    return { users: users as unknown as Entities.User[], total };
  }

  async GetAllUserEmails(): Promise<string[]> {
    const users = await UserModel.find({ email: { $exists: true } }).select('email');
    return users.map((u) => u.email).filter((e): e is string => !!e);
  }

  async GetAllUserIds(): Promise<string[]> {
    const users = await UserModel.find().select('id');
    return users.map((u) => u.id).filter((i): i is string => !!i);
  }

  async CreateUser(user: Partial<Entities.User>): Promise<string> {
    try {
      const newUser = await UserModel.create(user);
      return newUser.id;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new AppError(400, 'User with same email already exists');
      }
      throw new AppError(400, 'User not created');
    }
  }

  async GetUserByEmail(email: string): Promise<Entities.User | null> {
    const user = await UserModel.findOne({ email }).lean();
    if (!user) return null;
    // Return lean document with password included, manually add id
    return {
      ...user,
      id: user._id.toString()
    } as any as Entities.User;
  }

  async GetUser(where: Partial<Entities.User>): Promise<Entities.User | null> {
    const query: any = { ...where };
    // Check if 'id' key exists in the query object
    if ('id' in query) {
      // If id is falsy (undefined, null, empty) or the string 'undefined', return null immediately
      if (!query.id || query.id === 'undefined') return null;

      query._id = query.id;
      delete query.id;
    }
    const user = await UserModel.findOne(query);
    return user ? (user.toJSON() as Entities.User) : null;
  }

  async UpdateUser(userId: string, updateData: Partial<Entities.User>): Promise<Entities.User | null> {
    const user = await UserModel.findByIdAndUpdate(userId, updateData, { new: true });
    return user ? (user.toJSON() as Entities.User) : null;
  }

  async GetAllCreators(): Promise<Entities.User[]> {
    const creators = await UserModel.find({ pageName: { $exists: true, $ne: null } });
    return creators as unknown as Entities.User[];
  }

  async GetAllCreatorsWithFollowStatus(currentUserId?: string, page: number = 1, limit: number = 10): Promise<any[]> {
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: { pageName: { $exists: true, $ne: null } } },
      // Exclude current user
      ...(currentUserId ? [{ $match: { _id: { $ne: new mongoose.Types.ObjectId(currentUserId) } } }] : []),
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Convert _id to string for lookup
      { $addFields: { strId: { $toString: '$_id' } } },
      // Lookup followers count
      {
        $lookup: {
          from: 'followers',
          localField: 'strId',
          foreignField: 'userId',
          as: 'followers'
        }
      },
      {
        $addFields: {
          followersCount: { $size: '$followers' }
        }
      },
      // Check if following
      ...(currentUserId ? [
        {
          $lookup: {
            from: 'followers',
            let: { userId: '$strId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$userId'] },
                      { $eq: ['$followerId', currentUserId] }
                    ]
                  }
                }
              }
            ],
            as: 'isFollowingCheck'
          }
        },
        {
          $addFields: {
            isFollowing: { $gt: [{ $size: '$isFollowingCheck' }, 0] }
          }
        }
      ] : [])
    ];

    const creators = await UserModel.aggregate(pipeline);

    // Map _id to id
    return creators.map(c => ({
      ...c,
      id: c._id.toString(),
      isFollowing: !!c.isFollowing
    }));
  }

  async GetTotalCreatorsCount(): Promise<number> {
    return UserModel.countDocuments({ pageName: { $exists: true, $ne: null } });
  }

  async GetTotalUsersCount(): Promise<number> {
    return UserModel.countDocuments();
  }

  async GetRevenueStats(): Promise<{ allTime: string; currentMonth: string }> {
    // Placeholder - Implement actual revenue logic using TransactionModel if available
    // For now returning 0 to satisfy interface
    return { allTime: '0', currentMonth: '0' };
  }

  async GetNewSignupsStats(): Promise<{ today: number; thisWeek: number; thisMonth: number }> {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setDate(now.getDate() - 30));

    const [today, thisWeek, thisMonth] = await Promise.all([
      UserModel.countDocuments({ createdAt: { $gte: todayStart } }),
      UserModel.countDocuments({ createdAt: { $gte: weekStart } }),
      UserModel.countDocuments({ createdAt: { $gte: monthStart } })
    ]);

    return { today, thisWeek, thisMonth };
  }

  async GetCreatorByIdWithFollowStatus(creatorId: string, currentUserId?: string): Promise<any> {
    const creator = await UserModel.findOne({ _id: creatorId, pageName: { $exists: true, $ne: null } }).lean();
    if (!creator) throw new AppError(400, 'Creator not found');

    const followersCount = await FollowerModel.countDocuments({ userId: creatorId });
    const subscribersCount = await SubscriptionModel.countDocuments({ creatorId });

    let isFollowing = false;
    let isSubscriber = false;
    if (currentUserId) {
      isFollowing = !!(await FollowerModel.exists({ userId: creatorId, followerId: currentUserId }));
      isSubscriber = !!(await SubscriptionModel.exists({ creatorId, subscriberId: currentUserId }));
    }

    return { ...creator, id: creator._id.toString(), followersCount, subscribersCount, isFollowing, isSubscriber };
  }

  async GetCreatorByPageNameWithFollowStatus(pageName: string, currentUserId?: string): Promise<any> {
    const creator = await UserModel.findOne({ pageName }).lean();
    if (!creator) throw new AppError(400, 'Creator not found');
    const creatorId = creator.id; // accessing virtual id might be tough on lean, use _id string conversion
    const cId = creator._id.toString();

    const followersCount = await FollowerModel.countDocuments({ userId: cId });
    let isFollowing = false;
    if (currentUserId) {
      isFollowing = !!(await FollowerModel.exists({ userId: cId, followerId: currentUserId }));
    }

    return { ...creator, id: cId, followersCount, isFollowing };
  }

  async GetTotalFollowers(creatorId: string): Promise<any> {
    return FollowerModel.countDocuments({ userId: creatorId });
  }

  async ToggleFollowUser(userId: string, followerId: string): Promise<{ action: 'followed' | 'unfollowed'; isFollowing: boolean }> {
    const uId = userId.trim();
    const fId = followerId.trim();

    this.logger.info('Db.ToggleFollowUser', { uId, fId });

    const existing = await FollowerModel.findOne({ userId: uId, followerId: fId });
    if (existing) {
      this.logger.info('Db.ToggleFollowUser - Found existing, removing', { existingId: existing._id });
      await FollowerModel.deleteOne({ _id: existing._id });
      return { action: 'unfollowed', isFollowing: false };
    } else {
      this.logger.info('Db.ToggleFollowUser - Creating new follow');
      await FollowerModel.create({ userId: uId, followerId: fId });
      return { action: 'followed', isFollowing: true };
    }
  }

  async GetCategories(): Promise<Entities.Category[]> {
    return CategoryModel.find() as unknown as Entities.Category[];
  }

  async AddCategories(categories: Entities.Category[]): Promise<void> {
    await CategoryModel.insertMany(categories);
  }

  // Posts
  async CreatePost(
    post: Partial<Entities.Post>,
    mediaFiles?: Array<Partial<Entities.PostMediaFile>>,
  ): Promise<string> {
    const newPost = new PostModel(post);
    if (mediaFiles && mediaFiles.length > 0) {
      newPost.mediaFiles = mediaFiles as any;
    }
    await newPost.save();
    return newPost.id;
  }

  async ReplacePostMedia(postId: string, mediaFiles: Array<Partial<Entities.PostMediaFile>>): Promise<void> {
    await PostModel.findByIdAndUpdate(postId, { mediaFiles });
  }

  async UpdatePost(postId: string, updateData: Partial<Entities.Post>): Promise<Entities.Post | null> {
    const post = await PostModel.findByIdAndUpdate(postId, updateData, { new: true });
    return post as unknown as Entities.Post;
  }

  async DeletePost(postId: string): Promise<void> {
    await PostModel.findByIdAndDelete(postId);
  }

  async GetPostById(postId: string): Promise<any | null> {
    const post = await PostModel.findById(postId).lean();
    if (!post) return null;

    // Populate creator
    const creator = await UserModel.findById(post.creatorId).lean();

    // Comments would need a Comment model, let's assume we create one or it's subdocument.
    // For now assuming empty comments implementation or adding CommentModel later
    const comments: any[] = [];

    return {
      ...post,
      mediaFiles: post.mediaFiles || [],
      creatorName: creator?.name,
      creatorImage: creator?.profilePhoto,
      categoryName: '', // Need to lookup category via creator
      comments
    };
  }

  async GetAllPostsByFollowedCreator(userId: string, page: number = 1, limit: number = 10): Promise<any[]> {
    // 1. Get list of followed creator IDs
    const follows = await FollowerModel.find({ followerId: userId }).select('userId');
    const followedIds = follows.map(f => f.userId);

    // 2. Find posts from these creators
    const posts = await PostModel.find({
      creatorId: { $in: followedIds },
      accessType: 'free'
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // 3. Enrich posts with creator info
    const enrichedPosts = await Promise.all((posts as any[]).map(async (p) => {
      const creator = await UserModel.findById(p.creatorId).select('profilePhoto pageName').lean();
      return {
        postId: p._id.toString(),
        postTitle: p.title,
        content: p.content,
        createdAt: p.createdAt,
        tags: p.tags,
        totalLikes: p.totalLikes,
        creatorId: p.creatorId,
        creatorImage: creator?.profilePhoto,
        pageName: creator?.pageName,
        totalComments: 0, // Placeholder
        attachedMedia: (p.mediaFiles as any)?.map((m: any) => m.url) || [],
        isLiked: false // Placeholder
      };
    }));

    return enrichedPosts;
  }

  async GetRecentPostsByCreator(creatorId: string): Promise<any[]> {
    const posts = await PostModel.find({ creatorId })
      .sort({ createdAt: -1 })
      .limit(10) // defaulting limit since SQL didn't have one but likely implicit or UI handled
      .lean();

    return (posts as any[]).map(p => ({
      id: p._id.toString(),
      title: p.title,
      createdAt: p.createdAt,
      accessType: p.accessType,
      totalLikes: p.totalLikes,
      totalComments: 0,
      mediaFiles: (p.mediaFiles as any)?.map((m: any) => m.url) || []
    }));
  }

  async GetPublicPostsByOtherCreators(userId: string, page: number = 1, limit: number = 10): Promise<any[]> {
    // Get followed IDs to exclude
    const follows = await FollowerModel.find({ followerId: userId }).select('userId');
    const followedIds = follows.map(f => f.userId);

    const posts = await PostModel.find({
      accessType: 'free',
      creatorId: { $nin: [...followedIds, userId] }
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const enrichedPosts = await Promise.all((posts as any[]).map(async (p) => {
      const creator = await UserModel.findById(p.creatorId).select('profilePhoto pageName').lean();
      return {
        postId: p._id.toString(),
        postTitle: p.title,
        content: p.content,
        createdAt: p.createdAt,
        tags: p.tags,
        totalLikes: p.totalLikes,
        creatorId: p.creatorId,
        creatorImage: creator?.profilePhoto,
        pageName: creator?.pageName,
        totalComments: 0,
        attachedMedia: (p.mediaFiles as any)?.map((m: any) => m.url) || [],
        isLiked: false
      };
    }));

    return enrichedPosts;
  }

  // Membership
  async CreateMembership(membership: Partial<Entities.Membership>): Promise<string> {
    const newMembership = await MembershipModel.create(membership);
    return newMembership.id;
  }

  async GetMembershipById(membershipId: string): Promise<Entities.Membership | null> {
    const m = await MembershipModel.findById(membershipId);
    return m ? (m.toJSON() as Entities.Membership) : null;
  }

  async GetMembershipsByCreator(creatorId: string): Promise<Entities.Membership[]> {
    const ms = await MembershipModel.find({ creatorId }).sort({ createdAt: -1 });
    return ms as unknown as Entities.Membership[];
  }

  async GetMembershipsOfCreatorForUser(creatorId: string, currentUserId: string): Promise<Entities.Membership[]> {
    const memberships = await MembershipModel.find({ creatorId }).sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all((memberships as any[]).map(async (m) => {
      const isSubscribed = await SubscriptionModel.exists({
        membershipId: m._id,
        subscriberId: currentUserId,
        status: 'active'
      });
      return {
        ...m,
        id: m._id.toString(),
        isSubscribed: !!isSubscribed
      };
    }));

    return enriched as unknown as Entities.Membership[];
  }

  async UpdateMembership(membershipId: string, updateData: Partial<Entities.Membership>): Promise<Entities.Membership | null> {
    const m = await MembershipModel.findByIdAndUpdate(membershipId, updateData, { new: true });
    return m as unknown as Entities.Membership;
  }

  async CheckExistingSubscription(memberId: string, creatorId: string): Promise<any> {
    const subscription = await SubscriptionModel.findOne({
      subscriberId: memberId,
      creatorId: creatorId,
      status: 'active'
    });
    return subscription ? subscription.toJSON() : null;
  }

  // Products
  async CreateProduct(product: Partial<Entities.Product>): Promise<string> {
    const newProduct = await ProductModel.create(product);
    return newProduct.id;
  }

  async GetProductsByCreator(creatorId: string): Promise<Entities.Product[]> {
    const products = await ProductModel.find({ creatorId }).sort({ createdAt: -1 });
    return products as unknown as Entities.Product[];
  }

  async GetProductById(productId: string): Promise<Entities.Product | null> {
    const product = await ProductModel.findById(productId);
    return product ? (product.toJSON() as Entities.Product) : null;
  }

  async UpdateProduct(productId: string, updateData: Partial<Entities.Product>): Promise<Entities.Product | null> {
    const p = await ProductModel.findByIdAndUpdate(productId, updateData, { new: true });
    return p as unknown as Entities.Product;
  }

  async DeleteProduct(productId: string): Promise<void> {
    await ProductModel.findByIdAndDelete(productId);
  }

  async GetProductsByCreatorWithPurchaseStatus(creatorId: string, currentUserId: string): Promise<any[]> {
    const products = await ProductModel.find({ creatorId }).sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all((products as any[]).map(async (p) => {
      let isPurchased = false;
      if (currentUserId) {
        isPurchased = !!(await ProductPurchaseModel.exists({
          productId: p._id,
          userId: currentUserId,
          status: 'completed'
        }));
      }
      return {
        ...p,
        id: p._id.toString(),
        isPurchased
      };
    }));

    return enriched;
  }

  // Events
  async CreateEvent(event: Partial<Entities.Event>): Promise<string> {
    const newEvent = await EventModel.create(event);
    return newEvent.id;
  }

  async GetEventsByCreator(creatorId: string, currentUserId?: string): Promise<Entities.Event[]> {
    // currentUserId unused for now but kept for signature compatibility or future logic (e.g. tracking interest)
    const events = await EventModel.find({ creatorId }).sort({ createdAt: -1 });
    return events as unknown as Entities.Event[];
  }

  async GetSubscriptionsByCreatorId(creatorId: string): Promise<Entities.Subscription[]> {
    const subs = await SubscriptionModel.find({ creatorId, status: 'active' });
    return subs as unknown as Entities.Subscription[];
  }

  // Group Invites
  async GetGroupInviteById(id: string): Promise<Entities.GroupInvite | null> {
    const invite = await GroupInviteModel.findById(id);
    return invite ? (invite.toJSON() as Entities.GroupInvite) : null;
  }

  async UpdateGroupInvite(id: string, updateData: Partial<Entities.GroupInvite>): Promise<Entities.GroupInvite | null> {
    const invite = await GroupInviteModel.findByIdAndUpdate(id, updateData, { new: true });
    return invite ? (invite.toJSON() as Entities.GroupInvite) : null;
  }

  async DeleteGroupInvite(id: string): Promise<void> {
    await GroupInviteModel.findByIdAndDelete(id);
  }

  // Verification Tokens
  async StoreVerificationToken(data: { userId: string; token: string }): Promise<void> {
    await VerificationTokenModel.create(data);
  }

  async GetVerificationByToken(token: string): Promise<any | null> {
    const vt = await VerificationTokenModel.findOne({ token });
    return vt ? vt.toJSON() : null;
  }

  async DeleteVerificationToken(token: string): Promise<void> {
    await VerificationTokenModel.deleteOne({ token });
  }

  // Subscriptions
  async GetSubscriptionByUserAndCreator(userId: string, creatorId: string): Promise<Entities.Subscription | null> {
    const sub = await SubscriptionModel.findOne({ subscriberId: userId, creatorId: creatorId, status: 'active' });
    return sub ? (sub.toJSON() as Entities.Subscription) : null;
  }

  async CreateSubscription(subscription: Partial<Entities.Subscription>): Promise<string> {
    const newSub = await SubscriptionModel.create(subscription);
    return newSub.id;
  }

  async UpdateSubscriptionByStripeId(stripeSubscriptionId: string, updateData: Partial<Entities.Subscription>): Promise<Entities.Subscription | null> {
    const sub = await SubscriptionModel.findOneAndUpdate({ stripeSubscriptionId }, updateData, { new: true });
    return sub ? (sub.toJSON() as Entities.Subscription) : null;
  }

  async GetSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Entities.Subscription | null> {
    const sub = await SubscriptionModel.findOne({ stripeSubscriptionId });
    return sub ? (sub.toJSON() as Entities.Subscription) : null;
  }

  // Transactions
  async CreateTransaction(transaction: Partial<Entities.Transaction>): Promise<string> {
    const newTx = await TransactionModel.create(transaction);
    return newTx.id;
  }

  async GetCreatorTransactions(creatorId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<{ transactions: Entities.Transaction[]; total: number }> {
    const { page = 1, limit = 10, status, type } = params;
    const query: any = { creatorId };
    if (status) query.status = status;
    if (type) query.transactionType = type;

    const [transactions, total] = await Promise.all([
      TransactionModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      TransactionModel.countDocuments(query),
    ]);

    return { transactions: transactions as unknown as Entities.Transaction[], total };
  }



  async GetCreatorWalletBalance(creatorId: string): Promise<{
    totalBalance: number;
    availableBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    totalWithdrawals: number;
    thisMonthEarnings: number;
  }> {
    const stats = await TransactionModel.aggregate([
      { $match: { creatorId, status: 'succeeded' } },
      {
        $group: {
          _id: '$balanceStatus',
          total: { $sum: '$netAmount' }
        }
      }
    ]);

    const available = stats.find(s => s._id === 'available')?.total || 0;
    const pending = stats.find(s => s._id === 'incoming')?.total || 0;

    return {
      totalBalance: available + pending,
      availableBalance: available,
      pendingBalance: pending,
      totalEarnings: available + pending,
      totalWithdrawals: 0,
      thisMonthEarnings: 0
    };
  }

  async UpdateTransactionBalanceStatusByStripePaymentIntent(paymentIntentId: string, status: 'incoming' | 'available'): Promise<void> {
    await TransactionModel.updateMany({ stripePaymentIntentId: paymentIntentId }, { balanceStatus: status });
  }

  // Product Purchases
  async CreateProductPurchase(purchase: Partial<Entities.ProductPurchase>): Promise<string> {
    const newP = await ProductPurchaseModel.create(purchase);
    return newP.id;
  }

  async GetProductPurchaseByCheckoutSession(stripeCheckoutSessionId: string): Promise<Entities.ProductPurchase | null> {
    const p = await ProductPurchaseModel.findOne({ stripeCheckoutSessionId });
    return p ? (p.toJSON() as Entities.ProductPurchase) : null;
  }

  async CreateGroupInvite(groupInvite: Partial<Entities.GroupInvite>): Promise<string> {
    const invite = await GroupInviteModel.create(groupInvite);
    return invite.id;
  }

  async GetGroupInvitesByCreatorId(creatorId: string): Promise<Entities.GroupInvite[]> {
    const invites = await GroupInviteModel.find({ creatorId });
    return invites as unknown as Entities.GroupInvite[];
  }

  // Comments & Likes
  async DeleteComment(commentId: string, userId: string): Promise<void> {
    await CommentModel.findOneAndDelete({ _id: commentId, userId });
  }

  async GetPostLike(postId: string, userId: string): Promise<any> {
    return LikeModel.findOne({ postId, userId });
  }

  async LikePost(postId: string, userId: string): Promise<number> {
    await LikeModel.create({ postId, userId });
    return LikeModel.countDocuments({ postId });
  }

  async UnlikePost(postId: string, userId: string): Promise<number> {
    await LikeModel.findOneAndDelete({ postId, userId });
    return LikeModel.countDocuments({ postId });
  }

  // Suggested Creators
  async GetSuggestedCreators(userId: string, limit: number = 3): Promise<Entities.User[]> {
    const follows = await FollowerModel.find({ followerId: userId }).select('userId');

    // Filter out any undefined or invalid IDs
    const followedIds = follows
      .map(f => f.userId)
      .filter(id => id && id !== 'undefined');

    const validUserId = (userId && userId !== 'undefined') ? userId : null;
    const excludeIds = validUserId ? [...followedIds, validUserId] : followedIds;

    const creators = await UserModel.find({
      pageName: { $exists: true, $ne: null },
      _id: { $nin: excludeIds }
    }).limit(limit);
    return creators as unknown as Entities.User[];
  }

  // More Subscription Methods
  async GetSubscriptionsBySubscriberId(subscriberId: string): Promise<Entities.Subscription[]> {
    const subs = await SubscriptionModel.find({ subscriberId });
    return subs as unknown as Entities.Subscription[];
  }

  async GetSubscriptionById(id: string): Promise<Entities.Subscription | null> {
    const sub = await SubscriptionModel.findById(id);
    return sub ? (sub.toJSON() as Entities.Subscription) : null;
  }

  async UpdateSubscriptionStatus(id: string, status: string, reason?: string): Promise<void> {
    const update: any = { status };
    if (reason) update.cancelReason = reason;
    await SubscriptionModel.findByIdAndUpdate(id, update);
  }

  async DeleteSubscription(id: string): Promise<void> {
    await SubscriptionModel.findByIdAndDelete(id);
  }

  // Creator Insights
  async GetCreatorInsights(creatorId: string): Promise<any> {
    return {
      totalEarnings: 0,
      totalSubscribers: await SubscriptionModel.countDocuments({ creatorId, status: 'active' }),
      totalFollowers: await FollowerModel.countDocuments({ userId: creatorId }),
      totalViews: 0
    };
  }

  // Notifications
  async GetAllNotifications(userId: string, page: number = 1, limit: number = 10, type?: string): Promise<{ notifications: Entities.Notification[]; totalCount: number; totalPages: number; currentPage: number }> {
    const query: any = { userId };
    if (type) query.type = type;

    const [notifications, total] = await Promise.all([
      NotificationModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      NotificationModel.countDocuments(query)
    ]);

    return {
      notifications: notifications as unknown as Entities.Notification[],
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  async MarkNotificationAsRead(notificationId: string, userId: string): Promise<Entities.Notification> {
    const n = await NotificationModel.findOneAndUpdate({ _id: notificationId, userId }, { isRead: true }, { new: true });
    if (!n) throw new Error('Notification not found');
    return n.toJSON() as Entities.Notification;
  }

  async MarkAllNotificationsAsRead(userId: string): Promise<{ updatedCount: number }> {
    const res = await NotificationModel.updateMany({ userId, isRead: false }, { isRead: true });
    return { updatedCount: res.modifiedCount };
  }

  async GetUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, isRead: false });
  }

  async CreateNotification(notification: Partial<Entities.Notification>): Promise<string> {
    const n = await NotificationModel.create(notification);
    return n.id;
  }

  async UpdateProductPurchase(id: string, updateData: Partial<Entities.ProductPurchase>): Promise<Entities.ProductPurchase | null> {
    const p = await ProductPurchaseModel.findByIdAndUpdate(id, updateData, { new: true });
    return p ? (p.toJSON() as Entities.ProductPurchase) : null;
  }

  async GetProductPurchaseByUserAndProduct(userId: string, productId: string): Promise<Entities.ProductPurchase | null> {
    const p = await ProductPurchaseModel.findOne({ userId, productId, status: 'completed' });
    return p ? (p.toJSON() as Entities.ProductPurchase) : null;
  }
  async GetAllPaidPostsByMembershipCreators(userId: string, page: number = 1, limit: number = 10): Promise<Entities.Post[]> {
    const subs = await SubscriptionModel.find({ subscriberId: userId, status: 'active' }).select('creatorId');
    const creatorIds = subs.map(s => s.creatorId);

    const posts = await PostModel.find({
      creatorId: { $in: creatorIds },
      accessType: 'premium'
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return posts as unknown as Entities.Post[];
  }

  async GetAllMyPosts(userId: string, page: number = 1, limit: number = 10): Promise<Entities.Post[]> {
    const posts = await PostModel.find({ creatorId: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return posts as unknown as Entities.Post[];
  }

  async DeleteMembership(membershipId: string): Promise<void> {
    await MembershipModel.findByIdAndDelete(membershipId);
  }

  async GetEventById(eventId: string, currentUserId?: string): Promise<Entities.Event | null> {
    const event = await EventModel.findById(eventId);
    return event ? (event.toJSON() as Entities.Event) : null;
  }

  async UpdateEvent(eventId: string, updateData: Partial<Entities.Event>): Promise<Entities.Event | null> {
    const event = await EventModel.findByIdAndUpdate(eventId, updateData, { new: true });
    return event ? (event.toJSON() as Entities.Event) : null;
  }

  async DeleteEvent(eventId: string): Promise<void> {
    await EventModel.findByIdAndDelete(eventId);
  }

  async GetAllFutureEvents(currentUserId?: string): Promise<Entities.Event[]> {
    const now = new Date().toISOString();
    const events = await EventModel.find({ eventDate: { $gte: now } }).sort({ eventDate: 1 });
    return events as unknown as Entities.Event[];
  }

  async ToggleEventInterest(userId: string, eventId: string): Promise<{ action: 'interested' | 'not_interested'; isInterested: boolean }> {
    const interested = true; // Placeholder logic
    return {
      action: interested ? 'interested' : 'not_interested',
      isInterested: interested
    };
  }

  async AddComment(postId: string, userId: string, content: string): Promise<string> {
    const comment = await CommentModel.create({ postId, userId, content });
    return comment.id;
  }
}
