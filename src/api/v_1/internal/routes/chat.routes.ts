import * as express from 'express';
import { jwtAuth } from '../middlewares/api-auth';
import { ChatController } from '../controller/chat.controller';

const router = express.Router();
const controller = new ChatController();

router.use(jwtAuth);

router.get('/conversations', controller.getUserConversations);
router.get('/conversations/:conversationId/messages', controller.getConversationMessages);
router.put('/conversations/:conversationId/read', controller.markConversationAsRead);
router.get('/conversations/unread-count', controller.getUnreadCount);
router.get('/subscribed-creators', controller.getSubscribedCreators);

export const chatRoutes = router;


