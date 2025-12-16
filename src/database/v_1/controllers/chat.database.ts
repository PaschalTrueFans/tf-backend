/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { Entities } from '../../../helpers';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';
import { ConversationModel, MessageModel, ConversationReadModel } from '../../models/Chat';
import { UserModel } from '../../models/User';

export class ChatDatabase {
  private logger: typeof Logger;

  public constructor(args: any) {
    this.logger = Logger;
  }

  async GetOrCreateConversation(memberId: string, creatorId: string): Promise<Entities.Conversation> {
    this.logger.info('Db.GetOrCreateConversation', { memberId, creatorId });

    // Sort IDs to ensure consistent lookup if order doesn't matter, OR enforce logic
    // Assuming memberId and creatorId roles are distinct and order matters per schema comments
    try {
      let conv = await ConversationModel.findOne({ memberId, creatorId });

      if (!conv) {
        conv = await ConversationModel.create({ memberId, creatorId }) as any;
      }

      return conv!.toJSON() as unknown as Entities.Conversation;
    } catch (err: any) {
      if (err.code === 11000) {
        // Concurrent creation race condition
        const conv = await ConversationModel.findOne({ memberId, creatorId });
        return conv?.toJSON() as unknown as Entities.Conversation;
      }
      throw new AppError(400, 'Failed to get or create conversation');
    }
  }

  async GetConversationById(conversationId: string): Promise<Entities.Conversation | null> {
    const conv = await ConversationModel.findById(conversationId);
    return conv ? (conv.toJSON() as unknown as Entities.Conversation) : null;
  }

  async IsUserInConversation(userId: string, conversationId: string): Promise<boolean> {
    const conv = await ConversationModel.findOne({
      _id: conversationId,
      $or: [{ memberId: userId }, { creatorId: userId }]
    });
    return !!conv;
  }

  async CreateMessage(conversationId: string, senderId: string, content: string): Promise<Entities.Message> {
    const message = await MessageModel.create({ conversationId, senderId, content });

    // Update conversation timestamp
    await ConversationModel.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

    return message.toJSON() as unknown as Entities.Message;
  }

  async GetMessages(conversationId: string, limit = 50, offset = 0): Promise<Entities.Message[]> {
    const messages = await MessageModel.find({ conversationId })
      .sort({ createdAt: 1 }) // Ascending for chat history
      .skip(offset)
      .limit(limit);

    return messages as unknown as Entities.Message[];
  }

  async GetConversationsForUser(userId: string): Promise<any[]> {
    // 1. Find conversations
    const conversations = await ConversationModel.find({
      $or: [{ memberId: userId }, { creatorId: userId }]
    }).sort({ updatedAt: -1 }).lean() as any[];

    const enriched: any[] = await Promise.all(conversations.map(async (c) => {
      // Last message
      const lastMsg = await MessageModel.findOne({ conversationId: c._id }).sort({ createdAt: -1 });

      // Unread count
      const lastRead = await ConversationReadModel.findOne({ conversationId: c._id, userId });
      const lastReadAt = lastRead?.lastReadAt || new Date(0);

      const unreadCount = await MessageModel.countDocuments({
        conversationId: c._id,
        senderId: { $ne: userId },
        createdAt: { $gt: lastReadAt }
      });

      // Other user info
      const otherUserId = (c.memberId === userId) ? c.creatorId : c.memberId;
      const otherUser = await UserModel.findById(otherUserId).select('name creatorName profilePhoto').lean();

      return {
        id: c._id.toString(),
        memberId: c.memberId,
        creatorId: c.creatorId,
        lastMessageContent: lastMsg?.content || null,
        lastMessageAt: lastMsg?.createdAt || null,
        unreadCount,
        otherUserId,
        otherUserName: otherUser?.name || null,
        otherUserCreatorName: otherUser?.creatorName || null,
        otherUserProfilePhoto: otherUser?.profilePhoto || null
      };
    }));

    // Sort by lastMessageAt descending
    enriched.sort((a, b) => {
      const da = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const db = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return db - da;
    });

    return enriched;
  }

  async GetUser(where: Partial<any>): Promise<any | null> {
    const user = await UserModel.findOne(where);
    return user ? user.toJSON() : null;
  }

  async MarkConversationAsRead(conversationId: string, userId: string): Promise<void> {
    await ConversationReadModel.findOneAndUpdate(
      { conversationId, userId },
      { lastReadAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async GetTotalUnreadCount(userId: string): Promise<number> {
    // Find all conversations
    const conversations = await ConversationModel.find({
      $or: [{ memberId: userId }, { creatorId: userId }]
    }).select('_id') as any[];
    const convIds = conversations.map(c => c._id);

    // This is expensive to loop. Aggregation better.
    // Or just sum up.
    let total = 0;
    for (const id of convIds) {
      const lastRead = await ConversationReadModel.findOne({ conversationId: id, userId });
      const lastReadAt = lastRead?.lastReadAt || new Date(0);
      const count = await MessageModel.countDocuments({
        conversationId: id,
        senderId: { $ne: userId },
        createdAt: { $gt: lastReadAt }
      });
      total += count;
    }
    return total;
  }
}
