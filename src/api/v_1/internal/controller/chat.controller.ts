import { Request, Response } from 'express';
import { Db } from '../../../../database/db';
import { genericError } from '../../../../helpers/utils';

export class ChatController {
  public getUserConversations = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const userId = req.userId;
      const conversations = await db.v1.Chat.GetConversationsForUser(userId);
      body = { data: conversations };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getConversationMessages = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const userId = req.userId;
      const conversationId = req.params.conversationId;

      const isAllowed = await db.v1.Chat.IsUserInConversation(userId, conversationId);
      if (!isAllowed) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const messages = await db.v1.Chat.GetMessages(conversationId, 100, 0);
      body = { data: messages };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public getSubscribedCreators = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const userId = req.userId;
      
      // Get user's active subscriptions
      const subscriptions = await db.v1.User.GetSubscriptionsBySubscriberId(userId);
      
      // Get creator details for each subscription
      const creators = await Promise.all(
        subscriptions.map(async (sub: any) => {
          const creator = await db.v1.User.GetUser({ id: sub.creatorId });
          return {
            id: creator?.id,
            name: creator?.name,
            creatorName: creator?.creatorName,
            pageName: creator?.pageName,
            profilePhoto: creator?.profilePhoto,
            bio: creator?.bio,
            subscriptionId: sub.id,
            subscriptionStatus: sub.subscriptionStatus
          };
        })
      );
      
      body = { data: creators.filter((c: any) => c.id) };
    } catch (error) {
      genericError(error, res);
      return;
    }
    res.json(body);
  };

  public markConversationAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const db = res.locals.db as Db;
      const userId = req.userId;
      const conversationId = req.params.conversationId;

      const isAllowed = await db.v1.Chat.IsUserInConversation(userId, conversationId);
      if (!isAllowed) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await db.v1.Chat.MarkConversationAsRead(conversationId, userId);
      res.json({ success: true });
    } catch (error) {
      genericError(error, res);
    }
  };

  public getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const db = res.locals.db as Db;
      const userId = req.userId;
      const unreadCount = await db.v1.Chat.GetTotalUnreadCount(userId);
      res.json({ data: { unreadCount } });
    } catch (error) {
      genericError(error, res);
    }
  };
}


