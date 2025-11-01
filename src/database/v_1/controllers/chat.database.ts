/* eslint-disable @typescript-eslint/no-explicit-any */
import { Knex } from 'knex';
import { Entities } from '../../../helpers';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';

export class ChatDatabase {
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

  async GetOrCreateConversation(memberId: string, creatorId: string): Promise<Entities.Conversation> {
    this.logger.info('Db.GetOrCreateConversation', { memberId, creatorId });
    const knexdb = this.GetKnex();

    // Try to find existing
    const findQuery = knexdb('conversations').where({ memberId, creatorId });
    {
      const { res, err } = await this.RunQuery(findQuery);
      if (err) {
        this.logger.error('Db.GetOrCreateConversation find failed', err);
        throw new AppError(400, 'Failed to get conversation');
      }
      if (res && res[0]) return res[0] as Entities.Conversation;
    }

    // Create new
    const insertQuery = knexdb('conversations').insert({ memberId, creatorId }, '*');
    const { res: insertRes, err: insertErr } = await this.RunQuery(insertQuery);
    if (insertErr) {
      // Unique constraint means it was created concurrently. Fetch again.
      const { res: reGetRes, err: reGetErr } = await this.RunQuery(findQuery);
      if (reGetErr || !reGetRes || !reGetRes[0]) {
        this.logger.error('Db.GetOrCreateConversation insert failed', insertErr);
        throw new AppError(400, 'Failed to create conversation');
      }
      return reGetRes[0] as Entities.Conversation;
    }
    return (insertRes?.[0] as Entities.Conversation) || ({} as Entities.Conversation);
  }

  async GetConversationById(conversationId: string): Promise<Entities.Conversation | null> {
    this.logger.info('Db.GetConversationById', { conversationId });
    const knexdb = this.GetKnex();
    const query = knexdb('conversations').where('id', conversationId);
    const { res, err } = await this.RunQuery(query);
    if (err) {
      this.logger.error('Db.GetConversationById failed', err);
      throw new AppError(400, 'Failed to fetch conversation');
    }
    return res?.[0] || null;
  }

  async IsUserInConversation(userId: string, conversationId: string): Promise<boolean> {
    this.logger.info('Db.IsUserInConversation', { userId, conversationId });
    const knexdb = this.GetKnex();
    const query = knexdb('conversations')
      .where('id', conversationId)
      .andWhere(function () {
        this.where('memberId', userId).orWhere('creatorId', userId);
      })
      .count<{ count: string }[]>({ count: '*' });
    const { res, err } = await this.RunQuery(query);
    if (err) {
      this.logger.error('Db.IsUserInConversation failed', err);
      throw new AppError(400, 'Failed to check conversation access');
    }
    const count = parseInt((res?.[0]?.count as unknown as string) || '0', 10);
    return count > 0;
  }

  async CreateMessage(conversationId: string, senderId: string, content: string): Promise<Entities.Message> {
    this.logger.info('Db.CreateMessage', { conversationId, senderId });
    const knexdb = this.GetKnex();
    const insertQuery = knexdb('messages').insert({ conversationId, senderId, content }, '*');
    const { res, err } = await this.RunQuery(insertQuery);
    if (err) {
      this.logger.error('Db.CreateMessage failed', err);
      throw new AppError(400, 'Failed to create message');
    }
    // Optionally bump conversation updatedAt
    const updateConversation = knexdb('conversations').where('id', conversationId).update({ updatedAt: knexdb.fn.now() });
    await this.RunQuery(updateConversation);
    return (res?.[0] as Entities.Message) || ({} as Entities.Message);
  }

  async GetMessages(conversationId: string, limit = 50, offset = 0): Promise<Entities.Message[]> {
    this.logger.info('Db.GetMessages', { conversationId, limit, offset });
    const knexdb = this.GetKnex();
    const query = knexdb('messages')
      .where('conversationId', conversationId)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .offset(offset);
    const { res, err } = await this.RunQuery(query);
    if (err) {
      this.logger.error('Db.GetMessages failed', err);
      throw new AppError(400, 'Failed to fetch messages');
    }
    return res ?? [];
  }

  async GetConversationsForUser(userId: string): Promise<
    Array<{
      id: string;
      memberId: string;
      creatorId: string;
      lastMessageContent: string | null;
      lastMessageAt: string | null;
      otherUserId: string;
      otherUserName: string | null;
      otherUserCreatorName: string | null;
      otherUserProfilePhoto: string | null;
      unreadCount: number;
    }>
  > {
    this.logger.info('Db.GetConversationsForUser', { userId });
    const knexdb = this.GetKnex();

    // Subquery to get last message per conversation
    const lastMessageSubquery = knexdb('messages as m')
      .select('m.conversationId')
      .max<{ conversationId: string; maxCreatedAt: Date }>('m.createdAt as maxCreatedAt')
      .groupBy('m.conversationId')
      .as('lm');

    // Subquery to get last read time per conversation for this user
    const lastReadSubquery = knexdb('conversation_reads as cr')
      .select('cr.conversationId')
      .max('cr.lastReadAt as maxLastReadAt')
      .where('cr.userId', userId)
      .groupBy('cr.conversationId')
      .as('lr');

    // Subquery to count unread messages per conversation
    // Unread = messages where senderId != userId AND (no read record OR message.createdAt > lastReadAt)
    const unreadCountSubquery = knexdb('messages as um')
      .leftJoin('conversation_reads as cr2', function() {
        this.on('cr2.conversationId', '=', 'um.conversationId')
            .andOn('cr2.userId', '=', knexdb.raw('?', [userId]));
      })
      .where('um.senderId', '!=', userId)
      .where(function() {
        this.whereNull('cr2.lastReadAt')
            .orWhereRaw('um."createdAt" > cr2."lastReadAt"');
      })
      .select('um.conversationId')
      .count('* as unreadCount')
      .groupBy('um.conversationId')
      .as('uc');

    const query = knexdb('conversations as c')
      .leftJoin(lastMessageSubquery, 'c.id', 'lm.conversationId')
      .leftJoin('messages as last_m', function () {
        this.on('last_m.conversationId', '=', 'c.id').andOn('last_m.createdAt', '=', knexdb.ref('lm.maxCreatedAt'));
      })
      .leftJoin(unreadCountSubquery, 'c.id', 'uc.conversationId')
      .where(function () {
        this.where('c.memberId', userId).orWhere('c.creatorId', userId);
      })
      .select(
        'c.id',
        'c.memberId',
        'c.creatorId',
        knexdb.raw('COALESCE(last_m.content, NULL) as "lastMessageContent"'),
        knexdb.raw('COALESCE(lm."maxCreatedAt", NULL) as "lastMessageAt"'),
        knexdb.raw('COALESCE(uc."unreadCount"::int, 0) as "unreadCount"'),
      )
      .orderBy([{ column: 'lastMessageAt', order: 'desc', nulls: 'last' } as any, { column: 'c.updatedAt', order: 'desc' }]);

    const { res, err } = await this.RunQuery(query);
    if (err) {
      this.logger.error('Db.GetConversationsForUser failed', err);
      throw new AppError(400, 'Failed to fetch conversations');
    }
    
    // Enrich conversations with other user details
    const enrichedConversations = await Promise.all(
      (res || []).map(async (conv: any) => {
        const otherUserId = conv.memberId === userId ? conv.creatorId : conv.memberId;
        const otherUser = await this.GetUser({ id: otherUserId });
        
        return {
          ...conv,
          otherUserId,
          otherUserName: otherUser?.name || null,
          otherUserCreatorName: otherUser?.creatorName || null,
          otherUserProfilePhoto: otherUser?.profilePhoto || null,
          unreadCount: parseInt(conv.unreadCount || '0', 10),
        };
      })
    );
    
    return enrichedConversations;
  }

  async GetUser(where: Partial<any>): Promise<any | null> {
    this.logger.info('Db.GetUser', { where });

    const knexdb = this.GetKnex();

    const query = knexdb('users').where(where);

    const { res, err } = await this.RunQuery(query);

    if (err) {
      this.logger.error('Db.GetUser failed', err);
      throw new AppError(400, 'User not found');
    }

    if (!res) {
      this.logger.info('Db.GetUser User not found', err);
      return null;
    }

    return res[0];
  }

  async MarkConversationAsRead(conversationId: string, userId: string): Promise<void> {
    this.logger.info('Db.MarkConversationAsRead', { conversationId, userId });
    const knexdb = this.GetKnex();
    
    // Upsert: update lastReadAt if exists, insert if not
    const query = knexdb('conversation_reads')
      .insert({
        conversationId,
        userId,
        lastReadAt: knexdb.fn.now(),
      })
      .onConflict(['conversationId', 'userId'])
      .merge({
        lastReadAt: knexdb.fn.now(),
        updatedAt: knexdb.fn.now(),
      });
    
    const { err } = await this.RunQuery(query);
    if (err) {
      this.logger.error('Db.MarkConversationAsRead failed', err);
      throw new AppError(400, 'Failed to mark conversation as read');
    }
  }

  async GetTotalUnreadCount(userId: string): Promise<number> {
    this.logger.info('Db.GetTotalUnreadCount', { userId });
    const knexdb = this.GetKnex();
    
    // Count unread messages across all conversations where user is a participant
    // Unread = messages where senderId != userId AND (no read record OR message.createdAt > read.lastReadAt)
    const query = knexdb('messages as m')
      .join('conversations as c', 'm.conversationId', 'c.id')
      .leftJoin('conversation_reads as cr', function() {
        this.on('cr.conversationId', '=', 'm.conversationId')
            .andOn('cr.userId', '=', knexdb.raw('?', [userId]));
      })
      .where(function() {
        this.where('c.memberId', userId).orWhere('c.creatorId', userId);
      })
      .where('m.senderId', '!=', userId)
      .where(function() {
        this.whereNull('cr.lastReadAt')
            .orWhereRaw('m."createdAt" > cr."lastReadAt"');
      })
      .count<{ count: string }[]>('* as count');
    
    const { res, err } = await this.RunQuery(query);
    if (err) {
      this.logger.error('Db.GetTotalUnreadCount failed', err);
      throw new AppError(400, 'Failed to get unread count');
    }
    
    const count = parseInt((res?.[0]?.count as unknown as string) || '0', 10);
    return count;
  }
}


