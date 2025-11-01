import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import * as JWT from 'jsonwebtoken';
import { Db } from '../database/db';
import { Jwt } from '../helpers/env';
import { Logger } from '../helpers/logger';

interface ServerToClientEvents {
  message: (payload: { conversationId: string; message: { id: string; senderId: string; content: string; createdAt: string } }) => void;
  conversationCreated: (payload: { conversation: { id: string; memberId: string; creatorId: string } }) => void;
  messageSent: (payload: { messageId: string; status: string }) => void;
  conversationUpdated: (payload: { conversationId: string; lastMessageContent: string; lastMessageAt: string }) => void;
  error: (payload: { message: string }) => void;
}

interface ClientToServerEvents {
  joinRoom: (payload: { conversationId: string }) => void;
  message: (payload: { conversationId: string; content: string }) => void;
  newConversation: (payload: { creatorId: string; firstMessage: string }) => void;
}

type InterServerEvents = Record<string, never>;
type SocketData = { userId: string };

export function createSocketServer(httpServer: HttpServer, corsOrigin: string | string[] = '*') {
  const io = new IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['*'],
    },
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8,
  });

  io.use((socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, next: (err?: Error) => void) => {
    try {
      const token = (socket.handshake.auth?.token as string) || '';
      if (!token) return next(new Error('Unauthorized'));
      const decoded: any = JWT.verify(token, Jwt.JWT_SECRET || '');
      if (!decoded?.id || decoded.isRefreshToken) return next(new Error('Invalid token'));
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    Logger.info('Socket connected', { 
      userId: socket.data.userId, 
      socketId: socket.id,
      transport: socket.conn.transport.name,
      userAgent: socket.handshake.headers['user-agent']
    });
    const db = new Db();
    
    // Join user's personal room for global updates
    socket.join(`user:${socket.data.userId}`);

    socket.on('joinRoom', async ({ conversationId }: { conversationId: string }) => {
      try {
        const isAllowed = await db.v1.Chat.IsUserInConversation(socket.data.userId, conversationId);
        if (!isAllowed) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }
        socket.join(conversationId);
        // Mark conversation as read when user opens it
        await db.v1.Chat.MarkConversationAsRead(conversationId, socket.data.userId);
      } catch (e) {
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('message', async ({ conversationId, content }: { conversationId: string; content: string }) => {
      try {
        if (!content || !content.trim()) return;
        const isAllowed = await db.v1.Chat.IsUserInConversation(socket.data.userId, conversationId);
        if (!isAllowed) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }
        const message = await db.v1.Chat.CreateMessage(conversationId, socket.data.userId, content.trim());
        
        // Emit the message to the conversation room
        io.to(conversationId).emit('message', { conversationId, message });
        
        // Emit conversation update to all participants
        io.to(conversationId).emit('conversationUpdated', {
          conversationId,
          lastMessageContent: message.content,
          lastMessageAt: message.createdAt
        });
        
        // Also emit to personal rooms for users not in the conversation room
        const conversation = await db.v1.Chat.GetConversationById(conversationId);
        if (conversation) {
          io.to(`user:${conversation.memberId}`).emit('conversationUpdated', {
            conversationId,
            lastMessageContent: message.content,
            lastMessageAt: message.createdAt
          });
          io.to(`user:${conversation.creatorId}`).emit('conversationUpdated', {
            conversationId,
            lastMessageContent: message.content,
            lastMessageAt: message.createdAt
          });
        }
        
        // Emit confirmation to sender
        socket.emit('messageSent', { messageId: message.id, status: 'sent' });
      } catch (e) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('newConversation', async ({ creatorId, firstMessage }: { creatorId: string; firstMessage: string }) => {
      try {
        if (!firstMessage || !firstMessage.trim()) return;
        // Business rule: only member can initiate, must be subscribed
        const memberId = socket.data.userId;
        // Verify subscription
        const existingSubscription = await db.v1.User.CheckExistingSubscription(memberId, creatorId);
        if (!existingSubscription) {
          socket.emit('error', { message: 'Subscription required to start chat' });
          return;
        }
        const conversation = await db.v1.Chat.GetOrCreateConversation(memberId, creatorId);
        // First message by member only
        const message = await db.v1.Chat.CreateMessage(conversation.id, memberId, firstMessage.trim());

        // Join room and notify both participants
        socket.join(conversation.id);
        io.to(conversation.id).emit('message', { conversationId: conversation.id, message });
        
        // Emit conversation update to all participants
        io.to(conversation.id).emit('conversationUpdated', {
          conversationId: conversation.id,
          lastMessageContent: message.content,
          lastMessageAt: message.createdAt
        });
        
        // Also emit to personal rooms
        io.to(`user:${creatorId}`).emit('conversationUpdated', {
          conversationId: conversation.id,
          lastMessageContent: message.content,
          lastMessageAt: message.createdAt
        });
        io.to(`user:${memberId}`).emit('conversationUpdated', {
          conversationId: conversation.id,
          lastMessageContent: message.content,
          lastMessageAt: message.createdAt
        });
        
        // Emit confirmation to sender
        socket.emit('messageSent', { messageId: message.id, status: 'sent' });
        
        // Also notify the creator via a personal room if connected
        io.to(`user:${creatorId}`).emit('conversationCreated', { conversation });
        io.to(`user:${memberId}`).emit('conversationCreated', { conversation });
      } catch (e) {
        socket.emit('error', { message: 'Failed to create conversation' });
      }
    });

    // personal room for targeted events
    socket.join(`user:${socket.data.userId}`);

    socket.on('disconnect', () => {
      Logger.info('Socket disconnected', { userId: socket.data.userId, socketId: socket.id });
    });
  });

  return io;
}


