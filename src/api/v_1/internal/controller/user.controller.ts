import * as express from 'express';
import { Response, Request } from 'express';
import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { genericError, RequestBody, RequestQuery } from '../../../../helpers/utils';
import { BadRequest } from '../../../../helpers/errors';
import { UserService } from '../services/user.service';
import { Entities, Hash } from '../../../../helpers';
import { jwtAuth } from '../middlewares/api-auth';
import * as UserModel from '../models/user.model';
import * as PostModel from '../models/post.model';

export class UserController {
  constructor() {
    Logger.info('User controller initialized...');
  }

  // Get current user handler
  public getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      const response = await service.GetUserById(userId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Update user handler
  public updateUser = async (req: RequestBody<UserModel.UpdateUserBody>, res: Response): Promise<void> => {
    let body;
    try {
      await UserModel.UpdateUserBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      const response = await service.UpdateUser(userId, req.body);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Reset password handler
  public resetPassword = async (req: RequestBody<UserModel.ResetPasswordBody>, res: Response): Promise<void> => {
    let body;
    try {
      await UserModel.ResetPasswordBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      await service.ResetPassword(userId, req.body.oldPassword, req.body.newPassword);

      body = {
        message: 'Password reset successfully',
      };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Get all creators handler
  public getAllCreators = async (req: RequestQuery<{ page?: string; limit?: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const currentUserId = req.userId; // From JWT auth middleware
      
      // Parse pagination parameters with defaults
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);
      
      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({ error: 'Page must be greater than 0' });
        return;
      }
      if (limit < 1 || limit > 100) {
        res.status(400).json({ error: 'Limit must be between 1 and 100' });
        return;
      }
      
      const response = await service.GetAllCreators(currentUserId, page, limit);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get creator by ID handler
  public getCreatorById = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.params.id;
      const currentUserId = req.userId; // From JWT auth middleware
      const response = await service.GetCreatorById(creatorId, currentUserId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get creator by pageName handler
  public getCreatorByPageName = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const pageName = req.params.pageName;
      const currentUserId = req.userId; // From JWT auth middleware
      const response = await service.GetCreatorByPageName(pageName, currentUserId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Toggle follow creator handler
  public toggleFollowCreator = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.params.id;
      const followerId = req.userId; // From JWT auth middleware
      
      const result = await service.ToggleFollowCreator(creatorId, followerId);

      body = {
        message: `Successfully ${result.action} creator`,
        data: {
          action: result.action,
          isFollowing: result.isFollowing,
        },
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Posts
  public createPost = async (req: RequestBody<PostModel.CreatePostBody>, res: Response): Promise<void> => {
    let body;
    try {
      await PostModel.CreatePostBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;
      const id = await service.CreatePost(creatorId, req.body);

      body = { data: { id } };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public updatePost = async (req: RequestBody<PostModel.UpdatePostBody>, res: Response): Promise<void> => {
    let body;
    try {
      await PostModel.UpdatePostBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const postId = req.params.id;
      const row = await service.UpdatePost(postId, req.body);
      body = { data: row };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public deletePost = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const postId = req.params.id;
      await service.DeletePost(postId);
      body = { message: 'Post deleted' };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getAllPosts = async (req: RequestQuery<{ page?: string; limit?: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      
      // Parse pagination parameters with defaults
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);
      
      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({ error: 'Page must be greater than 0' });
        return;
      }
      if (limit < 1 || limit > 100) {
        res.status(400).json({ error: 'Limit must be between 1 and 100' });
        return;
      }
      
      const result = await service.GetAllPosts(userId, page, limit);
      body = { data: result };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getAllMyPosts = async (req: RequestQuery<{ page?: string; limit?: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      
      // Parse pagination parameters with defaults
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);
      
      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({ error: 'Page must be greater than 0' });
        return;
      }
      if (limit < 1 || limit > 100) {
        res.status(400).json({ error: 'Limit must be between 1 and 100' });
        return;
      }
      
      const result = await service.GetAllMyPosts(userId, page, limit);
      body = { data: result };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getPostById = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const postId = req.params.id;
      const row = await service.GetPostById(postId, req.userId);
      body = { data: row };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Membership CRUD handlers
  public createMembership = async (req: RequestBody<UserModel.CreateMembershipBody>, res: Response): Promise<void> => {
    let body;
    try {
      await UserModel.CreateMembershipBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;
      const id = await service.CreateMembership(creatorId, req.body);

      body = { data: { id } };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getMemberships = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;
      const memberships = await service.GetMembershipsByCreator(creatorId);
      body = { data: memberships };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };


  public getCreatorMemberships = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.params.creatorId;
      const memberships = await service.GetMembershipsByCreator(creatorId);
      body = { data: memberships };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  

  public getMembershipById = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const membershipId = req.params.id;
      const membership = await service.GetMembershipById(membershipId);
      body = { data: membership };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public updateMembership = async (req: RequestBody<UserModel.UpdateMembershipBody>, res: Response): Promise<void> => {
    let body;
    try {
      await UserModel.UpdateMembershipBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const membershipId = req.params.id;
      const creatorId = req.userId;
      const membership = await service.UpdateMembership(membershipId, creatorId, req.body);
      body = { data: membership };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public deleteMembership = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const membershipId = req.params.id;
      const creatorId = req.userId;
      await service.DeleteMembership(membershipId, creatorId);
      body = { message: 'Membership deleted successfully' };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Product CRUD handlers
  public createProduct = async (req: RequestBody<UserModel.CreateProductBody>, res: Response): Promise<void> => {
    let body;
    try {
      await UserModel.CreateProductBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;
      const id = await service.CreateProduct(creatorId, req.body);
      body = { data: { id } };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getProducts = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;
      const products = await service.GetProductsByCreator(creatorId);
      body = { data: products };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getCreatorProducts = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.params.creatorId;
      const products = await service.GetProductsByCreator(creatorId, false); // Don't validate creator for public endpoint
      body = { data: products };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getProductById = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const productId = req.params.id;
      const product = await service.GetProductById(productId);
      body = { data: product };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public updateProduct = async (req: RequestBody<UserModel.UpdateProductBody>, res: Response): Promise<void> => {
    let body;
    try {
      await UserModel.UpdateProductBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const productId = req.params.id;
      const creatorId = req.userId;
      const product = await service.UpdateProduct(productId, creatorId, req.body);
      body = { data: product };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public deleteProduct = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const productId = req.params.id;
      const creatorId = req.userId;
      await service.DeleteProduct(productId, creatorId);
      body = { message: 'Product deleted successfully' };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Event CRUD handlers
  public createEvent = async (req: RequestBody<UserModel.CreateEventBody>, res: Response): Promise<void> => {
    let body;
    try {
      await UserModel.CreateEventBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;
      const id = await service.CreateEvent(creatorId, req.body);
      body = { data: { id } };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getEvents = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;
      const events = await service.GetEventsByCreator(creatorId);
      body = { data: events };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getEventById = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const eventId = req.params.id;
      const event = await service.GetEventById(eventId);
      body = { data: event };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public updateEvent = async (req: RequestBody<UserModel.UpdateEventBody>, res: Response): Promise<void> => {
    let body;
    try {
      await UserModel.UpdateEventBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const eventId = req.params.id;
      const creatorId = req.userId;
      const event = await service.UpdateEvent(eventId, creatorId, req.body);
      body = { data: event };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public deleteEvent = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const eventId = req.params.id;
      const creatorId = req.userId;
      await service.DeleteEvent(eventId, creatorId);
      body = { message: 'Event deleted successfully' };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Event Interest handler
  public toggleEventInterest = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const eventId = req.params.eventId;
      const userId = req.userId;
      const result = await service.ToggleEventInterest(userId, eventId);
      body = { data: result };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get all future events
  public getAllEvents = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const events = await service.GetAllFutureEvents();
      body = { data: events };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Comment CRUD handlers
  public addComment = async (req: RequestBody<PostModel.AddCommentBody>, res: Response): Promise<void> => {
    let body;
    try {
      await PostModel.AddCommentBodySchema.parseAsync(req.body);
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const postId = req.params.id;
      const userId = req.userId;
      const commentId = await service.AddComment(postId, userId, req.body.comment);

      body = { 
        message: 'Comment added successfully',
        data: { id: commentId } 
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public deleteComment = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const commentId = req.params.id;
      const userId = req.userId;
      await service.DeleteComment(commentId, userId);
      body = { message: 'Comment deleted successfully' };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Post Like/Unlike handlers
  public likePost = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const postId = req.params.id;
      const userId = req.userId;
      const result = await service.LikePost(postId, userId);
      body = { 
        message: 'Post liked successfully',
        data: result
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public unlikePost = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const postId = req.params.id;
      const userId = req.userId;
      const result = await service.UnlikePost(postId, userId);
      body = { 
        message: 'Post unliked successfully',
        data: result
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get suggested creators handler
  public getSuggestedCreators = async (req: RequestQuery<{ limit?: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      
      // Parse limit parameter with default
      const limit = parseInt(req.query.limit || '5', 10);
      
      // Validate limit parameter
      if (limit < 1 || limit > 10) {
        res.status(400).json({ error: 'Limit must be between 1 and 10' });
        return;
      }
      
      const response = await service.GetSuggestedCreators(userId, limit);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Subscribe to creator handler
  public subscribeToCreator = async (req: RequestBody<{ membershipId: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      const { membershipId } = req.body;

      if (!membershipId) {
        throw new BadRequest('Membership ID is required');
      }

      const response = await service.SubscribeToCreator(userId, membershipId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get user subscriptions handler
  public getUserSubscriptions = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;

      const response = await service.GetUserSubscriptions(userId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get creator subscribers handler
  public getCreatorSubscribers = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.params.creatorId;

      if (!creatorId) {
        throw new BadRequest('Creator ID is required');
      }

      const response = await service.GetCreatorSubscribers(creatorId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Cancel subscription handler
  public cancelSubscription = async (req: RequestBody<{ reason?: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      const subscriptionId = req.params.subscriptionId;
      const { reason } = req.body;

      if (!subscriptionId) {
        throw new BadRequest('Subscription ID is required');
      }

      const response = await service.CancelSubscription(userId, subscriptionId, reason);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Unsubscribe from creator handler
  public unSubscribeToCreator = async (req: RequestBody<{ creatorId: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      const { creatorId } = req.body;

      if (!creatorId) {
        throw new BadRequest('Creator ID is required');
      }

      const response = await service.UnSubscribeToCreator(userId, creatorId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get creator insights handler
  public getCreatorInsights = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;

      const response = await service.GetCreatorInsights(creatorId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Notification handlers
  public getAllNotifications = async (req: RequestQuery<{ page?: string; limit?: string; type?: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;
      
      // Parse pagination parameters with defaults
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const type = req.query.type as 'member' | 'creator' | undefined;
      
      // Validate pagination parameters
      if (page < 1) {
        res.status(400).json({ error: 'Page must be greater than 0' });
        return;
      }
      if (limit < 1 || limit > 100) {
        res.status(400).json({ error: 'Limit must be between 1 and 100' });
        return;
      }
      
      // Validate type parameter
      if (type && !['member', 'creator'].includes(type)) {
        res.status(400).json({ error: 'Type must be either "member" or "creator"' });
        return;
      }
      
      const result = await service.GetAllNotifications(userId, page, limit, type);
      body = { data: result };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const notificationId = req.params.id;
      const userId = req.userId;

      if (!notificationId) {
        throw new BadRequest('Notification ID is required');
      }

      const notification = await service.MarkNotificationAsRead(notificationId, userId);

      body = {
        success: true,
        data: notification,
        message: 'Notification marked as read successfully',
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;

      const result = await service.MarkAllNotificationsAsRead(userId);

      body = {
        success: true,
        data: result,
        message: 'All notifications marked as read successfully',
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getUnreadNotificationCount = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;

      const unreadCount = await service.GetUnreadNotificationCount(userId);

      body = {
        success: true,
        data: { unreadCount },
        message: 'Unread count retrieved successfully',
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Group Invites handlers
  public createGroupInvite = async (req: RequestBody<{ groupName: string; platform: string; link: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;
      const response = await service.CreateGroupInvite(creatorId, req.body);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getGroupInvitesByCreatorId = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const creatorId = req.userId;
      const response = await service.GetGroupInvitesByCreatorId(creatorId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public getGroupInviteById = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const groupInviteId = req.params.id;
      const response = await service.GetGroupInviteById(groupInviteId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public updateGroupInvite = async (req: RequestBody<Partial<{ groupName: string; platform: string; link: string }>>, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const groupInviteId = req.params.id;
      const creatorId = req.userId;
      const response = await service.UpdateGroupInvite(groupInviteId, creatorId, req.body);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  public deleteGroupInvite = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const groupInviteId = req.params.id;
      const creatorId = req.userId;
      await service.DeleteGroupInvite(groupInviteId, creatorId);

      body = {
        message: 'Group invite deleted successfully',
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Send verification email handler
  public sendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;

      await service.SendVerificationEmail(userId);

      body = {
        message: 'Verification email sent successfully',
      };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  // Verify user handler
  public verifyUser = async (req: RequestBody<{ token: string }>, res: Response): Promise<void> => {
    let body;
    try {
      const token = req.body.token;
      
      if (!token) {
        throw new BadRequest('Verification token is required');
      }

      const db = res.locals.db as Db;
      const service = new UserService({ db });
      const userId = req.userId;

      await service.VerifyUser(token, userId);

      body = {
        message: 'Email verified successfully',
      };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };
}
