/* eslint-disable @typescript-eslint/no-explicit-any */
//
import { Knex } from 'knex';
import { Entities } from '../../../helpers';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';
import * as UserModel from '../../../api/v_1/internal/models/auth.model';
import { DatabaseErrors } from '../../../helpers/contants';

export class UserDatabase {
  private logger: typeof Logger;

  private GetKnex: () => Knex;

  private RunQuery: (query: Knex.QueryBuilder) => Promise<{ res?: any[]; err: any }>;

  public constructor(args: {
    GetKnex: () => Knex;
    RunQuery: (query: Knex.QueryBuilder) => Promise<{ res?: any[]; err: any }>;
  }) {
    this.logger = Logger;
    this.GetKnex = args.GetKnex;
    this.RunQuery = args.RunQuery;
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

    const knexdb = this.GetKnex();
    const baseQuery = knexdb<Entities.User>('users');

    if (search) {
      baseQuery.andWhere(function () {
        this.whereILike('name', `%${search}%`).orWhereILike('email', `%${search}%`);
      });
    }

    if (role === 'creator') {
      baseQuery.whereNotNull('pageName');
    } else if (role === 'member') {
      baseQuery.whereNull('pageName');
    }

    if (isBlocked) {
      baseQuery.andWhere('isBlocked', true);
    }

    const paginatedQuery = baseQuery
      .clone()
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const countQuery = baseQuery.clone().clearSelect().count('id as total');

    const [{ res: usersRes, err: usersErr }, { res: countRes, err: countErr }] = await Promise.all([
      this.RunQuery(paginatedQuery),
      this.RunQuery(countQuery),
    ]);

    if (usersErr) {
      this.logger.error('Db.GetUsersWithFilters failed fetching users', usersErr);
      throw new AppError(400, 'Failed to fetch users');
    }

    if (countErr) {
      this.logger.error('Db.GetUsersWithFilters failed counting users', countErr);
      throw new AppError(400, 'Failed to fetch users count');
    }

    const total = parseInt(countRes?.[0]?.total ?? '0', 10);

    return {
      users: (usersRes ?? []) as Entities.User[],
      total,
    };
  }

  async GetAllUserEmails(): Promise<string[]> {
    this.logger.info('Db.GetAllUserEmails');

    const knexdb = this.GetKnex();

    const query = knexdb('users').select('email').whereNotNull('email');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetAllUserEmails failed', err);
      throw new AppError(400, 'Failed to fetch user emails');
    }

    const emails = (res ?? [])
      .map((row) => row.email as string | null)
      .filter((email): email is string => Boolean(email));

    const uniqueEmails = Array.from(new Set(emails));

    return uniqueEmails;
  }

  async GetAllUserIds(): Promise<string[]> {
    this.logger.info('Db.GetAllUserIds');

    const knexdb = this.GetKnex();

    const query = knexdb('users').select('id');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetAllUserIds failed', err);
      throw new AppError(400, 'Failed to fetch user IDs');
    }

    const userIds = (res ?? [])
      .map((row) => row.id as string | null)
      .filter((id): id is string => Boolean(id));

    return userIds;
  }

  async CreateUser(user: Partial<Entities.User>): Promise<string> {
    this.logger.info('Db.CreateUser', { user });

    const knexdb = this.GetKnex();

    const query = knexdb('users').insert(user, 'id');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      if (err.code === DatabaseErrors.DUPLICATE) {
        this.logger.error('Db.CreateUser failed due to duplicate key', err);

        throw new AppError(400, 'User with same email already exist');
      }
      throw new AppError(400, 'User not created');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.CreateUser User not created', err);

      throw new AppError(400, `User not created `);
    }

    const { id } = res[0];
    return id;
  }

  async GetUserByEmail(email: string): Promise<Entities.User | null> {
    this.logger.info('Db.GetUserByEmail', { email });

    const knexdb = this.GetKnex();

    const query = knexdb('users').where({ email });

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetUserByEmail failed', err);

      throw new AppError(400, 'User not found');
    }

    if (!res) {
      this.logger.info('Db.GetUser User not found', err);

      return null;
    }

    return res[0];
  }

  async GetUser(where: Partial<Entities.User>): Promise<Entities.User | null> {
    this.logger.info('Db.GetUser', { where });

    const knexdb = this.GetKnex();

    const query = knexdb('users').where(where);

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetUserByEmail failed', err);

      throw new AppError(400, 'User not found');
    }

    if (!res) {
      this.logger.info('Db.GetUserByEmail User not found', err);

      return null;
    }
    return res[0];
  }

  async UpdateUser(userId: string, updateData: Partial<Entities.User>): Promise<Entities.User | null> {
    this.logger.info('Db.UpdateUser', { userId, updateData });

    const knexdb = this.GetKnex();

    const query = knexdb('users').where({ id: userId }).update(updateData).returning('*');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.UpdateUser failed', err);
      throw new AppError(400, 'User update failed');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.UpdateUser User not found or not updated', err);
      return null;
    }

    return res[0];
  }

  async GetAllCreators(): Promise<Entities.User[]> {
    this.logger.info('Db.GetAllCreators');

    const knexdb = this.GetKnex();

    const query = knexdb('users').whereNotNull('pageName');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetAllCreators failed', err);
      throw new AppError(400, 'Failed to fetch creators');
    }

    if (!res) {
      this.logger.info('Db.GetAllCreators No creators found');
      return [];
    }

    return res;
  }

  async GetAllCreatorsWithFollowStatus(currentUserId?: string, page: number = 1, limit: number = 10): Promise<any[]> {
    this.logger.info('Db.GetAllCreatorsWithFollowStatus', { currentUserId, page, limit });

    const knexdb = this.GetKnex();
    const offset = (page - 1) * limit;

    const query = knexdb('users')
      .select([
        'users.*',
        knexdb.raw('COUNT(DISTINCT followers.id) as "followersCount"'),
        knexdb.raw('categories.name as category'),
        knexdb.raw(`
          bool_or(user_follows.id IS NOT NULL) as isFollowing
        `)
      ])
      .leftJoin('followers', 'users.id', 'followers.userId')
      .leftJoin('categories', 'users.categoryId', 'categories.id')
      .leftJoin('followers as user_follows', function () {
        this.on('users.id', '=', 'user_follows.userId')
            .andOn('user_follows.followerId', '=', knexdb.raw('?', [currentUserId]));
      })
      .whereNotNull('users.pageName')
      .andWhere('users.id', '!=', knexdb.raw('?', [currentUserId]))
      // .andWhereNot('users.id', knexdb.raw('?', [currentUserId]))
      .groupBy('users.id', 'categories.id', 'categories.name')
      .orderBy('users.createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetAllCreatorsWithFollowStatus failed', err);
      throw new AppError(400, 'Failed to fetch creators');
    }

    if (!res) {
      this.logger.info('Db.GetAllCreatorsWithFollowStatus No creators found');
      return [];
    }

    return res;
  }

  async GetTotalCreatorsCount(): Promise<number> {
    this.logger.info('Db.GetTotalCreatorsCount');

    const knexdb = this.GetKnex();

    const query = knexdb('users')
      .whereNotNull('pageName')
      .count('id as total');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetTotalCreatorsCount failed', err);
      throw new AppError(400, 'Failed to fetch creators count');
    }

    return parseInt(res?.[0]?.total || '0', 10);
  }

  async GetCreatorByIdWithFollowStatus(creatorId: string, currentUserId?: string): Promise<any> {
    this.logger.info('Db.GetCreatorByIdWithFollowStatus', { creatorId, currentUserId });

    const knexdb = this.GetKnex();

    const query = knexdb('users')
    .select([
      'users.*',
      knexdb.raw('COUNT(DISTINCT followers.id) as "followersCount"'),
      knexdb.raw('COUNT(DISTINCT subscriptions.id) as "subscribersCount"'),
      knexdb.raw('bool_or(user_subscriptions.id IS NOT NULL) as "isSubscriber"'),
      knexdb.raw(`
        bool_or(user_follows.id IS NOT NULL) as isFollowing
      `)
    ])
    .leftJoin('followers', 'users.id', 'followers.userId')
    .leftJoin('subscriptions', 'users.id', 'subscriptions.creatorId')
    .leftJoin('followers as user_follows', function () {
      this.on('users.id', '=', 'user_follows.userId')
          .andOn('user_follows.followerId', '=', knexdb.raw('?', [currentUserId]));
    })
    .leftJoin('subscriptions as user_subscriptions', function () {
      this.on('users.id', '=', 'user_subscriptions.creatorId')
          .andOn('user_subscriptions.subscriberId', '=', knexdb.raw('?', [currentUserId]));
    })
    .where('users.id', creatorId)
    .whereNotNull('users.pageName')
    .groupBy('users.id')
    .first()

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetCreatorByIdWithFollowStatus failed', err);
      throw new AppError(400, 'Failed to fetch creator');
    }

    Logger.info('Db.GetCreatorByIdWithFollowStatus res', { res });

    return res;
  }

  async GetCreatorByPageNameWithFollowStatus(pageName: string, currentUserId?: string): Promise<any> {
    this.logger.info('Db.GetCreatorByPageNameWithFollowStatus', { pageName, currentUserId });

    const knexdb = this.GetKnex();

    const query = knexdb('users')
    .select([
      'users.*',
      knexdb.raw('COUNT(DISTINCT followers.id) as followersCount'),
      knexdb.raw(`
        bool_or(user_follows.id IS NOT NULL) as isFollowing
      `)
    ])
    .leftJoin('followers', 'users.id', 'followers.userId')
    .leftJoin('followers as user_follows', function () {
      this.on('users.id', '=', 'user_follows.userId')
          .andOn('user_follows.followerId', '=', knexdb.raw('?', [currentUserId]));
    })
    .where('users.pageName', pageName)
    .whereNotNull('users.pageName')
    .groupBy('users.id')
    .first()

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetCreatorByPageNameWithFollowStatus failed', err);
      throw new AppError(400, 'Failed to fetch creator');
    }

    Logger.info('Db.GetCreatorByPageNameWithFollowStatus res', { res });

    return res;
  }

  async GetTotalFollowers(creatorId: string): Promise<any> {
    this.logger.info('Db.GetTotalFollowers', { creatorId });
  
    const knexdb = this.GetKnex();
  
    const result = await knexdb('followers')
      .count('* as followersCount')
      .where('followers.userId', creatorId)
      .first();
  
    return result?.followersCount || 0;
  }
  

  async ToggleFollowUser(userId: string, followerId: string): Promise<{ action: 'followed' | 'unfollowed'; isFollowing: boolean }> {
    this.logger.info('Db.ToggleFollowUser', { userId, followerId });

    const knexdb = this.GetKnex();

    // Check if already following
    const existingFollow = await knexdb('followers')
      .where({ userId, followerId })
      .first();

    if (existingFollow) {
      // Unfollow
      await knexdb('followers')
        .where({ userId, followerId })
        .del();
      
      return { action: 'unfollowed', isFollowing: false };
    } else {
      // Follow
      await knexdb('followers')
        .insert({ userId, followerId });
      
      return { action: 'followed', isFollowing: true };
    }
  }

  async GetCategories(): Promise<Entities.Category[]> {
    this.logger.info('Db.GetCategories');

    const knexdb = this.GetKnex();

    const query = knexdb('categories');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetCategories failed', err);
      throw new AppError(400, 'Failed to fetch categories');
    }

    if (!res) {
      this.logger.info('Db.GetCategories No categories found');
      return [];
    }

    return res;
  }

  async AddCategories(categories: Entities.Category[]): Promise<void> {
    this.logger.info('Db.AddCategories', { categories });

    const knexdb = this.GetKnex();

    await knexdb('categories').insert(categories);

    this.logger.info('Db.AddCategories completed');
    return;
  }
  
  // Posts
  async CreatePost(
    post: Partial<Entities.Post>,
    mediaFiles?: Array<Partial<Entities.PostMediaFile>>,
  ): Promise<string> {
    this.logger.info('Db.CreatePost', { post });
    const knexdb = this.GetKnex();

    return await knexdb.transaction(async (trx) => {
      const insertPost = trx('posts').insert(post, 'id');
      const { res: postRes, err: postErr } = await this.RunQuery(insertPost);
      if (postErr || !postRes || postRes.length !== 1) {
        throw new AppError(400, 'Post not created');
      }
      const { id: postId } = postRes[0];

      if (mediaFiles && mediaFiles.length > 0) {
        const rows = mediaFiles.map((m) => ({ ...m, postId }));
        const insertMedia = trx('postsMediaFiles').insert(rows);
        const { err: mediaErr } = await this.RunQuery(insertMedia);
        if (mediaErr) throw new AppError(400, 'Post media not created');
      }

      return postId as string;
    });
  }

  async ReplacePostMedia(postId: string, mediaFiles: Array<Partial<Entities.PostMediaFile>>): Promise<void> {
    const knexdb = this.GetKnex();
    await knexdb.transaction(async (trx) => {
      await trx('postsMediaFiles').where({ postId }).del();
      if (mediaFiles.length > 0) {
        const rows = mediaFiles.map((m) => ({ ...m, postId }));
        await trx('postsMediaFiles').insert(rows);
      }
    });
  }

  async UpdatePost(postId: string, updateData: Partial<Entities.Post>): Promise<Entities.Post | null> {
    this.logger.info('Db.UpdatePost', { postId, updateData });
    const knexdb = this.GetKnex();
    const query = knexdb('posts').where({ id: postId }).update(updateData).returning('*');
    const { res, err } = await this.RunQuery(query);
    if (err) throw new AppError(400, `Post update failed: ${err.message}`);
    if (!res || res.length !== 1) return null;
    return res[0] as Entities.Post;
  }

  async DeletePost(postId: string): Promise<void> {
    this.logger.info('Db.DeletePost', { postId });
    const knexdb = this.GetKnex();
    const query = knexdb('posts').where({ id: postId }).del();
    const { err } = await this.RunQuery(query);
    if (err) throw new AppError(400, 'Post delete failed');
  }

  async GetPostById(postId: string): Promise<any | null> {
    const knexdb = this.GetKnex();
    
    // Get post with creator info
    const postQuery = knexdb('posts')
      .leftJoin('users', 'posts.creatorId', 'users.id')
      .leftJoin('categories', 'users.categoryId', 'categories.id')
      .where('posts.id', postId)
      .select([
        'posts.*',
        'users.name as creatorName',
        'users.profilePhoto as creatorImage',
        'categories.name as categoryName'
      ])
    
    const { res: postRes, err: postErr } = await this.RunQuery(postQuery);
    if (postErr) throw new AppError(400, 'Failed to fetch post');
    if (!postRes || postRes.length === 0) return null;
    const post = postRes[0];

    // Get media files
    const mediaQuery = knexdb('postsMediaFiles').where({ postId });
    const { res: mediaRes, err: mediaErr } = await this.RunQuery(mediaQuery);
    if (mediaErr) throw new AppError(400, 'Failed to fetch post media');

    // Get comments with user info, ordered by most recent
    const commentsQuery = knexdb('postComments')
      .leftJoin('users', 'postComments.userId', 'users.id')
      .where('postComments.postId', postId)
      .select([
        'postComments.*',
        'users.name as userName',
        'users.profilePhoto as userImage'
      ])
      .orderBy('postComments.createdAt', 'desc');
    
    const { res: commentsRes, err: commentsErr } = await this.RunQuery(commentsQuery);
    if (commentsErr) throw new AppError(400, 'Failed to fetch post comments');

    return { 
      ...post, 
      mediaFiles: mediaRes ?? [],
      comments: commentsRes ?? []
    };
  }

  public async GetAllPostsByFollowedCreator(userId: string, page: number = 1, limit: number = 10): Promise<any[]> {
    const knexdb = this.GetKnex();
    const offset = (page - 1) * limit;
   
    const query = knexdb('posts')
      .leftJoin('postComments', 'posts.id', 'postComments.postId')
      .leftJoin('postsMediaFiles', 'posts.id', 'postsMediaFiles.postId')
      .leftJoin('postLikes', function() {
        this.on('posts.id', '=', 'postLikes.postId')
            .andOn('postLikes.userId', '=', knexdb.raw('?', [userId]));
      })
      .innerJoin('followers', 'posts.creatorId', 'followers.userId') // userId = creator
      .innerJoin('users', 'posts.creatorId', 'users.id') // Get creator info
      .where('followers.followerId', userId) // followerId = viewer
      .where('posts.accessType', 'free')
      .groupBy([
        'posts.id',
        'posts.title',
        'posts.content',
        'posts.createdAt',
        'posts.tags',
        'posts.totalLikes',
        'users.id',
        'users.profilePhoto'
      ])
      .select([
        'posts.id as postId',
        'posts.title as postTitle',
        'posts.content',
        'posts.createdAt',
        'posts.tags',
        'posts.totalLikes',
        'posts.creatorId',
        'users.profilePhoto as creatorImage',
        'users.pageName as pageName',
        knexdb.raw('COUNT(DISTINCT "postComments".id) as "totalComments"'),
        knexdb.raw('ARRAY_AGG(DISTINCT "postsMediaFiles".url) FILTER (WHERE "postsMediaFiles".url IS NOT NULL) as "attachedMedia"'),
        knexdb.raw('BOOL_OR("postLikes".id IS NOT NULL) as "isLiked"')
      ])
      .orderBy('posts.createdAt', 'desc')
      .limit(limit)
      .offset(offset);
  
    const { res, err } = await this.RunQuery(query);
    if (err) throw new AppError(400, 'Failed to fetch posts');
    return res ?? [];
  }

  async GetRecentPostsByCreator(creatorId: string): Promise<any[]> {
    this.logger.info('Db.GetRecentPostsByCreator', { creatorId });

    const knexdb = this.GetKnex();
    const query = knexdb('posts')
      .leftJoin('postComments', 'posts.id', 'postComments.postId')
      .leftJoin('postsMediaFiles', 'posts.id', 'postsMediaFiles.postId')
      .where('posts.creatorId', creatorId)
      .groupBy([
        'posts.id',
        'posts.title',
        'posts.createdAt',
        'posts.accessType',
        'posts.totalLikes'
      ])
      .select([
        'posts.id',
        'posts.title',
        'posts.createdAt',
        'posts.accessType',
        'posts.totalLikes',
        knexdb.raw('COUNT(DISTINCT "postComments".id) as "totalComments"'),
        knexdb.raw('ARRAY_AGG(DISTINCT "postsMediaFiles".url) FILTER (WHERE "postsMediaFiles".url IS NOT NULL) as "mediaFiles"')
      ])
      .orderBy('posts.createdAt', 'desc');

    const { res, err } = await this.RunQuery(query);
    if (err) throw new AppError(400, 'Failed to fetch recent posts');
    return res ?? [];
  }

  async GetPublicPostsByOtherCreators(userId: string, page: number = 1, limit: number = 10): Promise<any[]> {
    this.logger.info('Db.GetPublicPostsByOtherCreators', { userId, page, limit });

    const knexdb = this.GetKnex();
    const offset = (page - 1) * limit;

    const query = knexdb('posts')
      .leftJoin('postComments', 'posts.id', 'postComments.postId')
      .leftJoin('postsMediaFiles', 'posts.id', 'postsMediaFiles.postId')
      .leftJoin('postLikes', function() {
        this.on('posts.id', '=', 'postLikes.postId')
            .andOn('postLikes.userId', '=', knexdb.raw('?', [userId]));
      })
      .innerJoin('users', 'posts.creatorId', 'users.id') // Get creator info
      .leftJoin('followers', function() {
        this.on('posts.creatorId', '=', 'followers.userId')
            .andOn('followers.followerId', '=', knexdb.raw('?', [userId]));
      })
      .where('posts.accessType', 'free') // Only public posts
      .whereNot('posts.creatorId', userId) // Exclude user's own posts
      .whereNull('followers.id') // Exclude posts from followed creators (they're handled separately)
      .groupBy([
        'posts.id',
        'posts.title',
        'posts.content',
        'posts.createdAt',
        'posts.tags',
        'posts.totalLikes',
        'posts.creatorId',
        'users.id',
        'users.profilePhoto',
        'users.pageName'
      ])
      .select([
        'posts.id as postId',
        'posts.title as postTitle',
        'posts.content',
        'posts.createdAt',
        'posts.tags',
        'posts.totalLikes',
        'posts.creatorId',
        'users.profilePhoto as creatorImage',
        'users.pageName as pageName',
        knexdb.raw('COUNT(DISTINCT "postComments".id) as "totalComments"'),
        knexdb.raw('ARRAY_AGG(DISTINCT "postsMediaFiles".url) FILTER (WHERE "postsMediaFiles".url IS NOT NULL) as "attachedMedia"'),
        knexdb.raw('BOOL_OR("postLikes".id IS NOT NULL) as "isLiked"')
      ])
      .orderBy('posts.createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    const { res, err } = await this.RunQuery(query);
    if (err) throw new AppError(400, 'Failed to fetch public posts');
    return res ?? [];
  }

  // Membership CRUD methods
  async CreateMembership(membership: Partial<Entities.Membership>): Promise<string> {
    this.logger.info('Db.CreateMembership', { membership });

    const knexdb = this.GetKnex();
    const query = knexdb('memberships').insert(membership, 'id');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.CreateMembership failed', err);
      throw new AppError(400, 'Membership not created');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.CreateMembership Membership not created', err);
      throw new AppError(400, 'Membership not created');
    }

    const { id } = res[0];
    return id;
  }

  async GetMembershipById(membershipId: string): Promise<Entities.Membership | null> {
    this.logger.info('Db.GetMembershipById', { membershipId });

    const knexdb = this.GetKnex();
    const query = knexdb('memberships').where({ id: membershipId });
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetMembershipById failed', err);
      throw new AppError(400, 'Failed to fetch membership');
    }

    if (!res || res.length === 0) {
      return null;
    }

    return res[0];
  }

  async GetMembershipsByCreator(creatorId: string): Promise<Entities.Membership[]> {
    this.logger.info('Db.GetMembershipsByCreator', { creatorId });

    const knexdb = this.GetKnex();
    const query = knexdb('memberships').where({ creatorId }).orderBy('createdAt', 'desc');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetMembershipsByCreator failed', err);
      throw new AppError(400, 'Failed to fetch memberships');
    }

    return res ?? [];
  }


  async GetMembershipsOfCreatorForUser(creatorId: string, currentUserId: string): Promise<Entities.Membership[]> {
    this.logger.info('Db.GetMembershipsOfCreatorForUser', { creatorId, currentUserId });

    const knexdb = this.GetKnex();
    const query = knexdb('memberships')
    .select('memberships.*',
      knexdb.raw('bool_or(user_subscriptions.id IS NOT NULL) as "isSubscribed"'),
    )
    .leftJoin('subscriptions as user_subscriptions', function () {
      this.on('memberships.id', '=', 'user_subscriptions.membershipId')
          .andOn('user_subscriptions.subscriberId', '=', knexdb.raw('?', [currentUserId]));
    })
    .where({ 'memberships.creatorId': creatorId }).orderBy('createdAt', 'desc')
    .groupBy('memberships.id')
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetMembershipsByCreator failed', err);
      throw new AppError(400, 'Failed to fetch memberships');
    }

    return res ?? [];
  }


  async UpdateMembership(membershipId: string, updateData: Partial<Entities.Membership>): Promise<Entities.Membership | null> {
    this.logger.info('Db.UpdateMembership', { membershipId, updateData });

    const knexdb = this.GetKnex();
    const query = knexdb('memberships').where({ id: membershipId }).update(updateData).returning('*');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.UpdateMembership failed', err);
      throw new AppError(400, 'Membership update failed');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.UpdateMembership Membership not found or not updated', err);
      return null;
    }

    return res[0];
  }

  async DeleteMembership(membershipId: string): Promise<void> {
    this.logger.info('Db.DeleteMembership', { membershipId });

    const knexdb = this.GetKnex();
    const query = knexdb('memberships').where({ id: membershipId }).del();
    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.DeleteMembership failed', err);
      throw new AppError(400, 'Membership delete failed');
    }
  }

  // Product CRUD methods
  async CreateProduct(product: Partial<Entities.Product>): Promise<string> {
    this.logger.info('Db.CreateProduct', { product });

    const knexdb = this.GetKnex();
    const query = knexdb('products').insert(product, 'id');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.CreateProduct failed', err);
      throw new AppError(400, 'Product not created');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.CreateProduct Product not created', err);
      throw new AppError(400, 'Product not created');
    }

    const { id } = res[0];
    return id;
  }

  async GetProductById(productId: string): Promise<Entities.Product | null> {
    this.logger.info('Db.GetProductById', { productId });

    const knexdb = this.GetKnex();
    const query = knexdb('products').where({ id: productId });
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetProductById failed', err);
      throw new AppError(400, 'Failed to fetch product');
    }

    if (!res || res.length === 0) {
      return null;
    }

    return res[0];
  }

  async GetProductsByCreator(creatorId: string): Promise<Entities.Product[]> {
    this.logger.info('Db.GetProductsByCreator', { creatorId });

    const knexdb = this.GetKnex();
    const query = knexdb('products').where({ creatorId }).orderBy('createdAt', 'desc');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetProductsByCreator failed', err);
      throw new AppError(400, 'Failed to fetch products');
    }

    return res ?? [];
  }

  async UpdateProduct(productId: string, updateData: Partial<Entities.Product>): Promise<Entities.Product | null> {
    this.logger.info('Db.UpdateProduct', { productId, updateData });

    const knexdb = this.GetKnex();
    const query = knexdb('products').where({ id: productId }).update(updateData).returning('*');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.UpdateProduct failed', err);
      throw new AppError(400, 'Product update failed');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.UpdateProduct Product not found or not updated', err);
      return null;
    }

    return res[0];
  }

  async DeleteProduct(productId: string): Promise<void> {
    this.logger.info('Db.DeleteProduct', { productId });

    const knexdb = this.GetKnex();
    const query = knexdb('products').where({ id: productId }).del();
    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.DeleteProduct failed', err);
      throw new AppError(400, 'Product delete failed');
    }
  }

  // Event CRUD methods
  async CreateEvent(event: Partial<Entities.Event>): Promise<string> {
    this.logger.info('Db.CreateEvent', { event });

    const knexdb = this.GetKnex();
    const query = knexdb('events').insert(event, 'id');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.CreateEvent failed', err);
      throw new AppError(400, 'Event not created');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.CreateEvent Event not created', err);
      throw new AppError(400, 'Event not created');
    }

    const { id } = res[0];
    return id;
  }

  async GetEventById(eventId: string, currentUserId?: string): Promise<any | null> {
    this.logger.info('Db.GetEventById', { eventId, currentUserId });

    const knexdb = this.GetKnex();
    const query = knexdb('events')
      .leftJoin('users', 'events.creatorId', 'users.id')
      .leftJoin('people_interested', function() {
        this.on('events.id', '=', 'people_interested.eventId');
        if (currentUserId) {
          this.andOn('people_interested.userId', '=', knexdb.raw('?', [currentUserId]));
        }
      })
      .select(
        'events.*',
        'users.name as creatorName',
        'users.pageName as creatorPageName',
        'users.profilePhoto as creatorProfilePhoto',
        knexdb.raw(currentUserId 
          ? 'BOOL_OR(people_interested.id IS NOT NULL) as "isInterested"'
          : 'false as "isInterested"'
        ),
        knexdb.raw(`
          (SELECT COUNT(*)::int FROM people_interested WHERE people_interested."eventId" = events.id) as "interestedCount"
        `)
      )
      .where({ 'events.id': eventId })
      .groupBy('events.id', 'users.id')
      .first();
    
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetEventById failed', err);
      throw new AppError(400, 'Failed to fetch event');
    }

    if (!res || res.length === 0) {
      return null;
    }

    const event = res[0] || res;
    
    // Convert isInterested from database boolean to JavaScript boolean
    return {
      ...event,
      isInterested: currentUserId ? (event.isInterested === true || event.isInterested === 't' || event.isInterested === 1) : false,
      interestedCount: parseInt(event.interestedCount) || 0
    };
  }

  async GetEventsByCreator(creatorId: string, currentUserId?: string): Promise<any[]> {
    this.logger.info('Db.GetEventsByCreator', { creatorId, currentUserId });

    const knexdb = this.GetKnex();
    const query = knexdb('events')
      .leftJoin('people_interested', function() {
        this.on('events.id', '=', 'people_interested.eventId');
        if (currentUserId) {
          this.andOn('people_interested.userId', '=', knexdb.raw('?', [currentUserId]));
        }
      })
      .where({ 'events.creatorId': creatorId })
      .select(
        'events.*',
        knexdb.raw(currentUserId 
          ? 'BOOL_OR(people_interested.id IS NOT NULL) as "isInterested"'
          : 'false as "isInterested"'
        )
      )
      .groupBy('events.id')
      .orderBy('events.createdAt', 'desc');
    
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetEventsByCreator failed', err);
      throw new AppError(400, 'Failed to fetch events');
    }

    // Convert isInterested from database boolean to JavaScript boolean
    return (res ?? []).map((event: any) => ({
      ...event,
      isInterested: currentUserId ? (event.isInterested === true || event.isInterested === 't' || event.isInterested === 1) : false
    }));
  }

  async GetAllFutureEvents(currentUserId?: string): Promise<any[]> {
    this.logger.info('Db.GetAllFutureEvents', { currentUserId });

    const knexdb = this.GetKnex();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    
    // Get events where eventDate is today or in the future, ordered by eventDate
    const query = knexdb('events')
      .leftJoin('people_interested', function() {
        this.on('events.id', '=', 'people_interested.eventId');
        if (currentUserId) {
          this.andOn('people_interested.userId', '=', knexdb.raw('?', [currentUserId]));
        }
      })
      .where(function() {
        this.where('events.eventDate', '>=', today.toISOString())
            .orWhereNull('events.eventDate'); // Include events without a date set
      })
      .select(
        'events.*',
        knexdb.raw(currentUserId 
          ? 'BOOL_OR(people_interested.id IS NOT NULL) as "isInterested"'
          : 'false as "isInterested"'
        )
      )
      .whereNot('events.creatorId', knexdb.raw('?', [currentUserId]))
      .where('events.isFree', true)
      .groupBy('events.id')
      .orderBy('events.eventDate', 'asc') // Order by eventDate ascending (earliest first)
      .orderBy('events.createdAt', 'desc'); // Secondary sort by createdAt for events without date or same date
    
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetAllFutureEvents failed', err);
      throw new AppError(400, 'Failed to fetch events');
    }

    // Convert isInterested from database boolean to JavaScript boolean
    return (res ?? []).map((event: any) => ({
      ...event,
      isInterested: currentUserId ? (event.isInterested === true || event.isInterested === 't' || event.isInterested === 1) : false
    }));
  }

  async UpdateEvent(eventId: string, updateData: Partial<Entities.Event>): Promise<Entities.Event | null> {
    this.logger.info('Db.UpdateEvent', { eventId, updateData });

    const knexdb = this.GetKnex();
    const query = knexdb('events').where({ id: eventId }).update(updateData).returning('*');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.UpdateEvent failed', err);
      throw new AppError(400, 'Event update failed');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.UpdateEvent Event not found or not updated', err);
      return null;
    }

    return res[0];
  }

  async DeleteEvent(eventId: string): Promise<void> {
    this.logger.info('Db.DeleteEvent', { eventId });

    const knexdb = this.GetKnex();
    const query = knexdb('events').where({ id: eventId }).del();
    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.DeleteEvent failed', err);
      throw new AppError(400, 'Event delete failed');
    }
  }

  // Event Interest methods
  async ToggleEventInterest(userId: string, eventId: string): Promise<{ action: 'interested' | 'not_interested'; isInterested: boolean }> {
    this.logger.info('Db.ToggleEventInterest', { userId, eventId });

    const knexdb = this.GetKnex();

    // Check if already interested
    const checkQuery = knexdb('people_interested')
      .where({ userId, eventId });
    
    const { res: existingInterest, err: checkErr } = await this.RunQuery(checkQuery);

    if (checkErr) {
      this.logger.error('Db.ToggleEventInterest check failed', checkErr);
      throw new AppError(400, 'Failed to check event interest');
    }

    if (existingInterest && existingInterest.length > 0) {
      // Remove interest
      const deleteQuery = knexdb('people_interested')
        .where({ userId, eventId })
        .del();
      
      const { err: deleteErr } = await this.RunQuery(deleteQuery);

      if (deleteErr) {
        this.logger.error('Db.ToggleEventInterest delete failed', deleteErr);
        throw new AppError(400, 'Failed to remove event interest');
      }
      
      return { action: 'not_interested', isInterested: false };
    } else {
      // Add interest
      const insertQuery = knexdb('people_interested')
        .insert({ userId, eventId });
      
      const { err: insertErr } = await this.RunQuery(insertQuery);

      if (insertErr) {
        this.logger.error('Db.ToggleEventInterest insert failed', insertErr);
        throw new AppError(400, 'Failed to add event interest');
      }
      
      return { action: 'interested', isInterested: true };
    }
  }

  async GetEventInterest(userId: string, eventId: string): Promise<Entities.PeopleInterested | null> {
    this.logger.info('Db.GetEventInterest', { userId, eventId });

    const knexdb = this.GetKnex();
    const query = knexdb('people_interested').where({ userId, eventId }).first();
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetEventInterest failed', err);
      throw new AppError(400, 'Failed to check event interest');
    }

    if (!res || res.length === 0) {
      return null;
    }

    return res[0];
  }

  // Comment CRUD methods
  async AddComment(postId: string, userId: string, comment: string): Promise<string> {
    this.logger.info('Db.AddComment', { postId, userId, comment });

    const knexdb = this.GetKnex();
    const query = knexdb('postComments').insert({ postId, userId, comment }, 'id');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.AddComment failed', err);
      throw new AppError(400, 'Comment not created');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.AddComment Comment not created', err);
      throw new AppError(400, 'Comment not created');
    }

    const { id } = res[0];
    return id;
  }

  async DeleteComment(commentId: string, userId: string): Promise<void> {
    this.logger.info('Db.DeleteComment', { commentId, userId });

    const knexdb = this.GetKnex();
    
    // First check if the comment exists and belongs to the user
    const commentQuery = knexdb('postComments')
      .where({ id: commentId, userId })
      .first();
    
    const { res: commentRes, err: commentErr } = await this.RunQuery(commentQuery);
    if (commentErr) {
      this.logger.error('Db.DeleteComment failed to check comment ownership', commentErr);
      throw new AppError(400, 'Failed to verify comment ownership');
    }

    if (!commentRes) {
      throw new AppError(404, 'Comment not found or you do not have permission to delete it');
    }

    // Delete the comment
    const deleteQuery = knexdb('postComments').where({ id: commentId, userId }).del();
    const { err } = await this.RunQuery(deleteQuery);

    if (err) {
      this.logger.error('Db.DeleteComment failed', err);
      throw new AppError(400, 'Comment delete failed');
    }
  }

  async GetPostLike(postId: string, userId: string): Promise<any> {
    this.logger.info('Db.GetPostLike', { postId, userId });

    const knexdb = this.GetKnex();
    const query = knexdb('postLikes')
      .where({ postId, userId })

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetPostLike failed', err);
      throw new AppError(400, 'Failed to check post like status');
    }

    return res?.[0] || null;
  }

  async GetAllMyPosts(userId: string, page: number = 1, limit: number = 10): Promise<any[]> {
    this.logger.info('Db.GetAllMyPosts', { userId, page, limit });

    const knexdb = this.GetKnex();
    const offset = (page - 1) * limit;

    const query = knexdb('posts')
    .select('id' , 'title' ,'createdAt' , 'accessType')
    .where({ creatorId: userId }).orderBy('createdAt', 'desc').limit(limit).offset(offset);
      const { res, err } = await this.RunQuery(query);
    if (err) throw new AppError(400, 'Failed to fetch my posts');
    return res ?? [];
  }
  

  async LikePost(postId: string, userId: string): Promise<number> {
    this.logger.info('Db.LikePost', { postId, userId });

    const knexdb = this.GetKnex();
    
    // Use transaction to ensure both operations succeed or fail together
    const trx = await knexdb.transaction();
    
    try {
      // Insert like record
      const likeData = {
        id: knexdb.raw('gen_random_uuid()'),
        postId,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await trx('postLikes').insert(likeData);

      // Increment totalLikes in posts table
      const updateResult = await trx('posts')
        .where({ id: postId })
        .increment('totalLikes', 1)
        .returning('totalLikes');

      await trx.commit();

      return parseInt(updateResult?.[0]?.totalLikes || '0', 10);
    } catch (error) {
      await trx.rollback();
      this.logger.error('Db.LikePost failed', error);
      throw new AppError(400, 'Failed to like post');
    }
  }

  async UnlikePost(postId: string, userId: string): Promise<number> {
    this.logger.info('Db.UnlikePost', { postId, userId });

    const knexdb = this.GetKnex();
    
    // Use transaction to ensure both operations succeed or fail together
    const trx = await knexdb.transaction();
    
    try {
      // Delete like record
      const deleteResult = await trx('postLikes')
        .where({ postId, userId })
        .del();

      if (deleteResult === 0) {
        await trx.rollback();
        throw new AppError(400, 'Like not found');
      }

      // Decrement totalLikes in posts table (with safety check)
      const currentQuery = await trx('posts')
        .select('totalLikes')
        .where({ id: postId })
        .first();

      const currentLikes = parseInt(currentQuery?.totalLikes || '0', 10);
      
      let newTotalLikes = currentLikes;
      if (currentLikes > 0) {
        const updateResult = await trx('posts')
          .where({ id: postId })
          .decrement('totalLikes', 1)
          .returning('totalLikes');
        
        newTotalLikes = parseInt(updateResult?.[0]?.totalLikes || '0', 10);
      }

      await trx.commit();
      return newTotalLikes;
    } catch (error) {
      await trx.rollback();
      this.logger.error('Db.UnlikePost failed', error);
      throw new AppError(400, 'Failed to unlike post');
    }
  }

  async GetSuggestedCreators(userId: string, limit: number = 5): Promise<any[]> {
    this.logger.info('Db.GetSuggestedCreators', { userId, limit });

    const knexdb = this.GetKnex();

    const query = knexdb('users')
      .select([
        'users.*',
        knexdb.raw('COUNT(DISTINCT followers.id) as followersCount'),
        knexdb.raw('COUNT(DISTINCT posts.id) as totalPosts')
      ])
      .leftJoin('followers', 'users.id', 'followers.userId')
      .leftJoin('posts', 'users.id', 'posts.creatorId')
      .leftJoin('followers as user_follows', function () {
        this.on('users.id', '=', 'user_follows.userId')
            .andOn('user_follows.followerId', '=', knexdb.raw('?', [userId]));
      })
      .whereNotNull('users.pageName') // Only creators
      .whereNot('users.id', userId) // Exclude current user
      .whereNull('user_follows.id') // Exclude already followed creators
      .groupBy('users.id')
      // .orderBy('followersCount', 'desc') // Order by popularity using raw expression
      .limit(limit);

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetSuggestedCreators failed', err);
      throw new AppError(400, 'Failed to fetch suggested creators');
    }

    if (!res) {
      this.logger.info('Db.GetSuggestedCreators No suggested creators found');
      return [];
    }

    return res;
  }

  // Subscription Methods
  async CreateSubscription(subscription: Partial<Entities.Subscription>): Promise<string> {
    this.logger.info('Db.CreateSubscription', { subscription });

    const knexdb = this.GetKnex();

    const query = knexdb('subscriptions').insert(subscription, 'id');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      if (err.code === DatabaseErrors.DUPLICATE) {
        this.logger.error('Db.CreateSubscription failed due to duplicate key', err);
        throw new AppError(400, 'Subscription already exists for this user-creator pair');
      }
      throw new AppError(400, `Subscription not created ${err}`);
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.CreateSubscription Subscription not created', err);
      throw new AppError(400, 'Subscription not created');
    }

    const { id } = res[0];
    return id;  
  }

  async GetSubscriptionById(id: string): Promise<Entities.Subscription | null> {
    this.logger.info('Db.GetSubscriptionById', { id });

    const knexdb = this.GetKnex();

    const query = knexdb('subscriptions').where('id', id)

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetSubscriptionById failed', err);
      throw new AppError(400, 'Failed to get subscription');
    }

    if (!res) {
      return null;
    }

    return res[0];
  }

  async GetSubscriptionsBySubscriberId(subscriberId: string): Promise<Entities.Subscription[]> {
    this.logger.info('Db.GetSubscriptionsBySubscriberId', { subscriberId });

    const knexdb = this.GetKnex();

    const query = knexdb('subscriptions')
      .where('subscriberId', subscriberId)
      .orderBy('createdAt', 'desc');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetSubscriptionsBySubscriberId failed', err);
      throw new AppError(400, 'Failed to get subscriptions');
    }

    if (!res) {
      return [];
    }

    return res;
  }

  async GetSubscriptionsByCreatorId(creatorId: string): Promise<Entities.Subscription[]> {
    this.logger.info('Db.GetSubscriptionsByCreatorId', { creatorId });

    const knexdb = this.GetKnex();

    const query = knexdb('subscriptions')
      .where('creatorId', creatorId)
      .orderBy('createdAt', 'desc');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetSubscriptionsByCreatorId failed', err);
      throw new AppError(400, 'Failed to get subscriptions');
    }

    if (!res) {
      return [];
    }

    return res;
  }

  async UpdateSubscriptionStatus(id: string, status: string, cancelReason?: string): Promise<void> {
    this.logger.info('Db.UpdateSubscriptionStatus', { id, status, cancelReason });

    const knexdb = this.GetKnex();

    const updateData: any = {
      subscriptionStatus: status,
      updatedAt: knexdb.fn.now()
    };

    if (status === 'canceled') {
      updateData.canceledAt = knexdb.fn.now();
      if (cancelReason) {
        updateData.cancelReason = cancelReason;
      }
    }

    const query = knexdb('subscriptions').where('id', id).update(updateData);

    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.UpdateSubscriptionStatus failed', err);
      throw new AppError(400, 'Failed to update subscription status');
    }
  }

  async CheckExistingSubscription(subscriberId: string, creatorId: string): Promise<Entities.Subscription | null> {
    this.logger.info('Db.CheckExistingSubscription', { subscriberId, creatorId });

    const knexdb = this.GetKnex();

    const query = knexdb('subscriptions')
      .where('subscriberId', subscriberId)
      .where('creatorId', creatorId)
      .where('subscriptionStatus', 'active')

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.CheckExistingSubscription failed', err);
      throw new AppError(400, 'Failed to check existing subscription');
    }

    return res?.[0] || null;
  }

  async DeleteSubscription(subscriptionId: string): Promise<void> {
    this.logger.info('Db.DeleteSubscription', { subscriptionId });

    const knexdb = this.GetKnex();

    const query = knexdb('subscriptions')
      .where('id', subscriptionId)
      .del();

    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.DeleteSubscription failed', err);
      throw new AppError(400, 'Failed to delete subscription');
    }
  }

  async GetSubscriptionByUserAndCreator(userId: string, creatorId: string): Promise<Entities.Subscription | null> {
    this.logger.info('Db.GetSubscriptionByUserAndCreator', { userId, creatorId });

    const knexdb = this.GetKnex();

    const query = knexdb('subscriptions')
      .where('subscriberId', userId)
      .where('creatorId', creatorId)
      .first();

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetSubscriptionByUserAndCreator failed', err);
      throw new AppError(400, 'Failed to get subscription');
    }

    return res?.[0] || null;
  }

  async UpdateSubscriptionByStripeId(stripeSubscriptionId: string, updateData: any): Promise<void> {
    this.logger.info('Db.UpdateSubscriptionByStripeId', { stripeSubscriptionId, updateData });

    const knexdb = this.GetKnex();

    const query = knexdb('subscriptions')
      .where('stripeSubscriptionId', stripeSubscriptionId)
      .update(updateData);

    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.UpdateSubscriptionByStripeId failed', err);
      throw new AppError(400, 'Failed to update subscription');
    }
  }

  async GetSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Entities.Subscription | null> {
    this.logger.info('Db.GetSubscriptionByStripeId', { stripeSubscriptionId });

    const knexdb = this.GetKnex();

    const query = knexdb('subscriptions')
      .where('stripeSubscriptionId', stripeSubscriptionId)

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetSubscriptionByStripeId failed', err);
      throw new AppError(400, 'Failed to get subscription');
    }

    if (!res) {
      return null;
    }

    return res[0];
  }

  async CreateTransaction(transaction: Partial<Entities.Transaction>): Promise<string> {
    this.logger.info('Db.CreateTransaction', { transaction });

    const knexdb = this.GetKnex();

    const query = knexdb('transactions').insert(transaction, 'id');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.CreateTransaction failed', err);
      throw new AppError(400, 'Failed to create transaction');
    }

    if (!res || res.length !== 1) {
      throw new AppError(400, 'Transaction not created');
    }

    const { id } = res[0];
    return id;
  }

  // Product Purchase methods
  async CreateProductPurchase(purchase: Partial<Entities.ProductPurchase>): Promise<string> {
    this.logger.info('Db.CreateProductPurchase', { purchase });

    const knexdb = this.GetKnex();
    const query = knexdb('product_purchases').insert(purchase, 'id');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.CreateProductPurchase failed', err);
      throw new AppError(400, 'Product purchase not created');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.CreateProductPurchase Purchase not created', err);
      throw new AppError(400, 'Product purchase not created');
    }

    const { id } = res[0];
    return id;
  }

  async GetProductPurchaseByUserAndProduct(userId: string, productId: string): Promise<Entities.ProductPurchase | null> {
    this.logger.info('Db.GetProductPurchaseByUserAndProduct', { userId, productId });

    const knexdb = this.GetKnex();
    const query = knexdb('product_purchases')
      .where({ userId, productId })
      .where('status', 'completed')

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetProductPurchaseByUserAndProduct failed', err);
      throw new AppError(500, 'Error getting product purchase');
    }

    return res?.[0] || null;
  }

  async GetProductPurchaseByCheckoutSession(checkoutSessionId: string): Promise<Entities.ProductPurchase | null> {
    this.logger.info('Db.GetProductPurchaseByCheckoutSession', { checkoutSessionId });

    const knexdb = this.GetKnex();
    const query = knexdb('product_purchases')
      .where({ stripeCheckoutSessionId: checkoutSessionId })

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetProductPurchaseByCheckoutSession failed', err);
      throw new AppError(500, 'Error getting product purchase');
    }

    return res?.[0] || null;
  }

  async UpdateProductPurchase(purchaseId: string, updateData: Partial<Entities.ProductPurchase>): Promise<void> {
    this.logger.info('Db.UpdateProductPurchase', { purchaseId, updateData });

    const knexdb = this.GetKnex();
    const query = knexdb('product_purchases')
      .where({ id: purchaseId })
      .update(updateData);

    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.UpdateProductPurchase failed', err);
      throw new AppError(400, 'Failed to update product purchase');
    }
  }

  async GetAllPaidPostsByMembershipCreators(userId: string, page: number = 1, limit: number = 10): Promise<any[]> {
    this.logger.info('Db.GetAllPaidPostsByMembershipCreators', { userId, page, limit });

    const knexdb = this.GetKnex();
    const offset = (page - 1) * limit;

    const query = knexdb('posts')
      .leftJoin('postComments', 'posts.id', 'postComments.postId')
      .leftJoin('postsMediaFiles', 'posts.id', 'postsMediaFiles.postId')
      .leftJoin('postLikes', function() {
        this.on('posts.id', '=', 'postLikes.postId')
            .andOn('postLikes.userId', '=', knexdb.raw('?', [userId]));
      })
      .innerJoin('subscriptions', 'posts.creatorId', 'subscriptions.creatorId') // Join with subscriptions
      .innerJoin('users', 'posts.creatorId', 'users.id') // Get creator info
      .where('subscriptions.subscriberId', userId) // User is subscribed
      .where('subscriptions.subscriptionStatus', 'active') // Active subscription
      .where('subscriptions.isActive', true) // Active subscription
      .where('posts.accessType', 'paid') // Only paid/private posts
      .groupBy([
        'posts.id',
        'posts.title',
        'posts.content',
        'posts.createdAt',
        'posts.tags',
        'posts.totalLikes',
        'posts.creatorId',
        'users.id',
        'users.profilePhoto',
        'users.pageName'
      ])
      .select([
        'posts.id as postId',
        'posts.title as postTitle',
        'posts.content',
        'posts.createdAt',
        'posts.tags',
        'posts.totalLikes',
        'posts.creatorId',
        'users.profilePhoto as creatorImage',
        'users.pageName as pageName',
        knexdb.raw('COUNT(DISTINCT "postComments".id) as "totalComments"'),
        knexdb.raw('ARRAY_AGG(DISTINCT "postsMediaFiles".url) FILTER (WHERE "postsMediaFiles".url IS NOT NULL) as "attachedMedia"'),
        knexdb.raw('BOOL_OR("postLikes".id IS NOT NULL) as "isLiked"')
      ])
      .orderBy('posts.createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    const { res, err } = await this.RunQuery(query);
    if (err) throw new AppError(400, 'Failed to fetch paid posts from subscribed creators');
    return res ?? [];
  }

  // Insights method - single query with joins
  async GetCreatorInsights(creatorId: string): Promise<{
    totalSubscribers: number;
    activeSubscribers: number;
    totalRevenue: number;
    postsThisMonth: number;
    freePosts: number;
    paidPosts: number;
    recentTransactions: any[];
  }> {
    this.logger.info('Db.GetCreatorInsights', { creatorId });

    const knexdb = this.GetKnex();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get insights data using optimized queries with joins
    const [
      { res: totalSubscribersRes, err: totalSubscribersErr },
      { res: activeSubscribersRes, err: activeSubscribersErr },
      { res: postsThisMonthRes, err: postsThisMonthErr },
      { res: freePostsRes, err: freePostsErr },
      { res: paidPostsRes, err: paidPostsErr },
      { res: transactionsRes, err: transactionsErr }
    ] = await Promise.all([
      // Total subscribers
      this.RunQuery(knexdb('subscriptions').count('id as count').where('creatorId', creatorId)),
      
      // Active subscribers
      this.RunQuery(knexdb('subscriptions')
        .count('id as count')
        .where('creatorId', creatorId)
        .where('subscriptionStatus', 'active')
        .where('isActive', true)),
      
      // Posts this month
      this.RunQuery(knexdb('posts')
        .count('id as count')
        .where('creatorId', creatorId)
        .where('createdAt', '>=', startOfMonth)),
      
      // Free posts
      this.RunQuery(knexdb('posts')
        .count('id as count')
        .where('creatorId', creatorId)
        .where('accessType', 'free')),
      
      // Paid posts
      this.RunQuery(knexdb('posts')
        .count('id as count')
        .where('creatorId', creatorId)
        .where('accessType', 'paid')),
      
      // Recent transactions with joins
      this.RunQuery(knexdb('subscriptions as s')
        .select(
          's.id',
          's.createdAt',
          'u.name as subscriberName',
          'm.name as membershipName',
          'm.price'
        )
        .join('users as u', 's.subscriberId', 'u.id')
        .join('memberships as m', 's.membershipId', 'm.id')
        .where('s.creatorId', creatorId)
        .where('s.subscriptionStatus', 'active')
        .orderBy('s.createdAt', 'desc')
        .limit(5))
    ]);

    // Check for errors
    if (totalSubscribersErr || activeSubscribersErr || postsThisMonthErr || freePostsErr || paidPostsErr) {
      this.logger.error('Db.GetCreatorInsights failed', { totalSubscribersErr, activeSubscribersErr, postsThisMonthErr, freePostsErr, paidPostsErr });
      throw new AppError(400, 'Failed to get creator insights');
    }

    if (transactionsErr) {
      this.logger.error('Db.GetCreatorInsights transactions failed', transactionsErr);
      throw new AppError(400, 'Failed to get recent transactions');
    }
    
    return {
      totalSubscribers: parseInt(totalSubscribersRes?.[0]?.count) || 0,
      activeSubscribers: parseInt(activeSubscribersRes?.[0]?.count) || 0,
      totalRevenue: Math.floor(Math.random() * 10000) + 1000, // Random amount as requested
      postsThisMonth: parseInt(postsThisMonthRes?.[0]?.count) || 0,
      freePosts: parseInt(freePostsRes?.[0]?.count) || 0,
      paidPosts: parseInt(paidPostsRes?.[0]?.count) || 0,
      recentTransactions: transactionsRes || []
    };
  }

  // Notification methods
  async GetAllNotifications(userId: string, page = 1, limit = 20, type?: 'member' | 'creator'): Promise<{
    notifications: Entities.Notification[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    this.logger.info('Db.GetAllNotifications', { userId, page, limit, type });
    const knexdb = this.GetKnex();
    const offset = (page - 1) * limit;

    // Build base query
    let countQuery = knexdb('notifications').where('userId', userId);
    let query = knexdb('notifications as n')
      .leftJoin('users as u', 'n.fromUserId', 'u.id')
      .where('n.userId', userId);

    // Add type filter if provided
    if (type) {
      countQuery = countQuery.where('type', type);
      query = query.where('n.type', type);
    }

    // Get total count
    const countQueryFinal = countQuery.count<{ count: string }[]>({ count: '*' });
    const { res: countRes, err: countErr } = await this.RunQuery(countQueryFinal);
    if (countErr) {
      this.logger.error('Db.GetAllNotifications count failed', countErr);
      throw new AppError(400, 'Failed to get notifications count');
    }
    const totalCount = parseInt((countRes?.[0]?.count as unknown as string) || '0', 10);

    // Get notifications with sender details
    const queryFinal = query
      .select(
        'n.id',
        'n.userId',
        'n.title',
        'n.message',
        'n.redirectUrl',
        'n.fromUserId',
        'n.type',
        'n.isRead',
        'n.createdAt',
        'n.updatedAt',
        'u.name as fromUserName',
        'u.creatorName as fromUserCreatorName',
        'u.profilePhoto as fromUserProfilePhoto'
      )
      .orderBy('n.createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    const { res, err } = await this.RunQuery(queryFinal);
    if (err) {
      this.logger.error('Db.GetAllNotifications failed', err);
      throw new AppError(400, 'Failed to fetch notifications');
    }

    const notifications = (res || []).map((notification: any) => ({
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      redirectUrl: notification.redirectUrl,
      fromUserId: notification.fromUserId,
      fromUserName: notification.fromUserName,
      fromUserCreatorName: notification.fromUserCreatorName,
      fromUserProfilePhoto: notification.fromUserProfilePhoto,
      isRead: notification.isRead,
      type: notification.type,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    })) as Entities.Notification[];

    return {
      notifications,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  }

  async MarkNotificationAsRead(notificationId: string, userId: string): Promise<Entities.Notification> {
    this.logger.info('Db.MarkNotificationAsRead', { notificationId, userId });
    const knexdb = this.GetKnex();

    // First verify the notification belongs to the user
    const verifyQuery = knexdb('notifications').where({ id: notificationId, userId });
    const { res: verifyRes, err: verifyErr } = await this.RunQuery(verifyQuery);
    if (verifyErr || !verifyRes || !verifyRes[0]) {
      this.logger.error('Db.MarkNotificationAsRead verification failed', verifyErr);
      throw new AppError(404, 'Notification not found');
    }

    // Update the notification
    const updateQuery = knexdb('notifications')
      .where({ id: notificationId, userId })
      .update({ isRead: true, updatedAt: knexdb.fn.now() }, '*');
    
    const { res, err } = await this.RunQuery(updateQuery);
    if (err) {
      this.logger.error('Db.MarkNotificationAsRead failed', err);
      throw new AppError(400, 'Failed to mark notification as read');
    }

    return (res?.[0] as Entities.Notification) || ({} as Entities.Notification);
  }

  async MarkAllNotificationsAsRead(userId: string): Promise<{ updatedCount: number }> {
    this.logger.info('Db.MarkAllNotificationsAsRead', { userId });
    const knexdb = this.GetKnex();

    const updateQuery = knexdb('notifications')
      .where({ userId, isRead: false })
      .update({ isRead: true, updatedAt: knexdb.fn.now() });

    const { res, err } = await this.RunQuery(updateQuery);
    if (err) {
      this.logger.error('Db.MarkAllNotificationsAsRead failed', err);
      throw new AppError(400, 'Failed to mark all notifications as read');
    }

    // Get count of updated notifications
    const countQuery = knexdb('notifications').where({ userId, isRead: true }).count<{ count: string }[]>({ count: '*' });
    const { res: countRes, err: countErr } = await this.RunQuery(countQuery);
    if (countErr) {
      this.logger.error('Db.MarkAllNotificationsAsRead count failed', countErr);
      throw new AppError(400, 'Failed to get updated count');
    }

    const updatedCount = parseInt((countRes?.[0]?.count as unknown as string) || '0', 10);
    return { updatedCount };
  }

  async GetUnreadCount(userId: string): Promise<number> {
    this.logger.info('Db.GetUnreadCount', { userId });
    const knexdb = this.GetKnex();

    const query = knexdb('notifications')
      .where({ userId, isRead: false })
      .count<{ count: string }[]>({ count: '*' });

    const { res, err } = await this.RunQuery(query);
    if (err) {
      this.logger.error('Db.GetUnreadCount failed', err);
      throw new AppError(400, 'Failed to get unread count');
    }

    return parseInt((res?.[0]?.count as unknown as string) || '0', 10);
  }

  async CreateNotification(notification: Partial<Entities.Notification>): Promise<string> {
    this.logger.info('Db.CreateNotification', { notification });
    const knexdb = this.GetKnex();

    const query = knexdb('notifications').insert(notification, 'id');
    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.CreateNotification failed', err);
      throw new AppError(400, 'Failed to create notification');
    }

    if (!res || res.length !== 1) {
      this.logger.error('Db.CreateNotification - No notification created');
      throw new AppError(400, 'Failed to create notification');
    }

    return res[0].id;
  }

  // Group Invites methods
  async CreateGroupInvite(groupInvite: Partial<Entities.GroupInvite>): Promise<string> {
    this.logger.info('Db.CreateGroupInvite', { groupInvite });

    const knexdb = this.GetKnex();

    const query = knexdb('group_invites').insert(groupInvite, 'id');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      if (err.code === DatabaseErrors.DUPLICATE) {
        this.logger.error('Db.CreateGroupInvite failed due to duplicate key', err);
        throw new AppError(400, 'Group invite already exists');
      }
      throw new AppError(400, 'Group invite not created');
    }

    if (!res || res.length !== 1) {
      this.logger.info('Db.CreateGroupInvite Group invite not created', err);
      throw new AppError(400, 'Group invite not created');
    }

    const { id } = res[0];
    return id;
  }

  async GetGroupInvitesByCreatorId(creatorId: string): Promise<Entities.GroupInvite[]> {
    this.logger.info('Db.GetGroupInvitesByCreatorId', { creatorId });

    const knexdb = this.GetKnex();

    const query = knexdb('group_invites')
      .select('*')
      .where('creatorId', creatorId)
      .orderBy('createdAt', 'desc');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetGroupInvitesByCreatorId Error getting group invites', err);
      throw new AppError(500, 'Error getting group invites');
    }

    return res || [];
  }

  async GetGroupInviteById(id: string): Promise<Entities.GroupInvite | undefined> {
    this.logger.info('Db.GetGroupInviteById', { id });

    const knexdb = this.GetKnex();

    const query = knexdb('group_invites').select('*').where('id', id).first();

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetGroupInviteById Error getting group invite', err);
      throw new AppError(500, 'Error getting group invite');
    }

    if (!res || res.length === 0) {
      this.logger.info('Db.GetGroupInviteById No group invite found');
      return undefined;
    }

    return res[0];
  }

  async UpdateGroupInvite(id: string, updateData: Partial<Entities.GroupInvite>): Promise<Entities.GroupInvite | undefined> {
    this.logger.info('Db.UpdateGroupInvite', { id, updateData });

    const knexdb = this.GetKnex();

    const query = knexdb('group_invites')
      .where('id', id)
      .update(updateData, '*');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.UpdateGroupInvite Error updating group invite', err);
      throw new AppError(500, 'Error updating group invite');
    }

    if (!res || res.length === 0) {
      this.logger.info('Db.UpdateGroupInvite No group invite found to update');
      return undefined;
    }

    return res[0];
  }

  async DeleteGroupInvite(id: string): Promise<void> {
    this.logger.info('Db.DeleteGroupInvite', { id });

    const knexdb = this.GetKnex();

    const query = knexdb('group_invites').where('id', id).del();

    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.DeleteGroupInvite Error deleting group invite', err);
      throw new AppError(500, 'Error deleting group invite');
    }
  }

  // Verification methods
  async StoreVerificationToken(data: Partial<Entities.VerifiedUser>): Promise<void> {
    this.logger.info('Db.StoreVerificationToken', { data });

    const knexdb = this.GetKnex();

    // Delete existing verification token for this user if any
    await knexdb('verifiedUsers').where('userId', data.userId).del();

    const query = knexdb('verifiedUsers').insert(data, ['id']);

    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.StoreVerificationToken Error storing verification token', err);
      throw new AppError(400, `Verification token not created ${err}`);
    }
  }

  async GetVerificationByToken(token: string): Promise<Entities.VerifiedUser | undefined> {
    this.logger.info('Db.GetVerificationByToken', { token });

    const knexdb = this.GetKnex();

    // Token expires after 24 hours
    const OneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const query = knexdb('verifiedUsers')
      .select('*')
      .where('token', token)
      .where('createdAt', '>', OneDayAgo)

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetVerificationByToken Error getting verification', err);
      return undefined;
    }

    console.log("res", res);

    if (!res || res.length === 0) {
      this.logger.info('Db.GetVerificationByToken No valid verification found');
      return undefined;
    }

    return res[0] as Entities.VerifiedUser;
  }

  async DeleteVerificationToken(token: string): Promise<void> {
    this.logger.info('Db.DeleteVerificationToken', { token });

    const knexdb = this.GetKnex();

    const query = knexdb('verifiedUsers').where('token', token).del();

    const { err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.DeleteVerificationToken Error deleting verification token', err);
      throw new AppError(500, 'Error deleting verification token');
    }
  }

  // Admin Dashboard Statistics Methods
  async GetTotalUsersCount(): Promise<number> {
    this.logger.info('Db.GetTotalUsersCount');

    const knexdb = this.GetKnex();

    const query = knexdb('users').count('* as count');

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetTotalUsersCount Error getting total users count', err);
      throw new AppError(500, 'Error getting total users count');
    }

    if (!res || res.length === 0) {
      return 0;
    }

    return parseInt(res[0].count, 10);
  }

  async GetRevenueStats(): Promise<{ allTime: number; currentMonth: number }> {
    this.logger.info('Db.GetRevenueStats');

    const knexdb = this.GetKnex();

    // Get all-time revenue
    const allTimeQuery = knexdb('transactions')
      .where('status', 'succeeded')
      .sum('amount as total');

    const { res: allTimeRes, err: allTimeErr } = await this.RunQuery(allTimeQuery);

    if (allTimeErr) {
      this.logger.error('Db.GetRevenueStats Error getting all-time revenue', allTimeErr);
      throw new AppError(500, 'Error getting all-time revenue');
    }

    const allTime = allTimeRes && allTimeRes[0]?.total ? parseFloat(allTimeRes[0].total) : 0;

    // Get current month revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const currentMonthQuery = knexdb('transactions')
      .where('status', 'succeeded')
      .where('processedAt', '>=', startOfMonth)
      .sum('amount as total');

    const { res: monthRes, err: monthErr } = await this.RunQuery(currentMonthQuery);

    if (monthErr) {
      this.logger.error('Db.GetRevenueStats Error getting current month revenue', monthErr);
      throw new AppError(500, 'Error getting current month revenue');
    }

    const currentMonth = monthRes && monthRes[0]?.total ? parseFloat(monthRes[0].total) : 0;

    return {
      allTime,
      currentMonth,
    };
  }

  async GetNewSignupsStats(): Promise<{ today: number; thisWeek: number; thisMonth: number }> {
    this.logger.info('Db.GetNewSignupsStats');

    const knexdb = this.GetKnex();

    // Today's signups
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayQuery = knexdb('users')
      .where('createdAt', '>=', startOfToday)
      .count('* as count');

    const { res: todayRes, err: todayErr } = await this.RunQuery(todayQuery);

    if (todayErr) {
      this.logger.error('Db.GetNewSignupsStats Error getting today signups', todayErr);
      throw new AppError(500, 'Error getting today signups');
    }

    const today = todayRes && todayRes[0]?.count ? parseInt(todayRes[0].count, 10) : 0;

    // This week's signups (last 7 days)
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekQuery = knexdb('users')
      .where('createdAt', '>=', startOfWeek)
      .count('* as count');

    const { res: weekRes, err: weekErr } = await this.RunQuery(weekQuery);

    if (weekErr) {
      this.logger.error('Db.GetNewSignupsStats Error getting this week signups', weekErr);
      throw new AppError(500, 'Error getting this week signups');
    }

    const thisWeek = weekRes && weekRes[0]?.count ? parseInt(weekRes[0].count, 10) : 0;

    // This month's signups
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthQuery = knexdb('users')
      .where('createdAt', '>=', startOfMonth)
      .count('* as count');

    const { res: monthRes, err: monthErr } = await this.RunQuery(monthQuery);

    if (monthErr) {
      this.logger.error('Db.GetNewSignupsStats Error getting this month signups', monthErr);
      throw new AppError(500, 'Error getting this month signups');
    }

    const thisMonth = monthRes && monthRes[0]?.count ? parseInt(monthRes[0].count, 10) : 0;

    return {
      today,
      thisWeek,
      thisMonth,
    };
  }
}
