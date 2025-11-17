import * as express from 'express';
import { UserController } from '../controller/user.controller';
import { jwtAuth } from '../middlewares/api-auth';

const router = express.Router();
const userController = new UserController();

// User routes
router.use(jwtAuth);

router.get('/', userController.getCurrentUser);
router.put('/', userController.updateUser);
router.put('/change-password', userController.resetPassword);

// Creator routes
router.get('/creators', userController.getAllCreators);
router.get('/creators/suggested', userController.getSuggestedCreators);
router.get('/creator/:id', userController.getCreatorById);
router.get('/creator/page/:pageName', userController.getCreatorByPageName);

// Toggle Follow/Unfollow route
router.post('/creators/:id/follow', userController.toggleFollowCreator);

// Posts CRUD
router.post('/posts', userController.createPost);
router.get('/posts', userController.getAllPosts);
router.get('/my-posts', userController.getAllMyPosts);
router.get('/posts/:id', userController.getPostById);
router.put('/posts/:id', userController.updatePost);
router.delete('/posts/:id', userController.deletePost);

// Post Like/Unlike
router.post('/posts/:id/like', userController.likePost);
router.delete('/posts/:id/like', userController.unlikePost);

// Comments CRUD
router.post('/posts/:id/comments', userController.addComment);
router.delete('/comments/:id', userController.deleteComment);

// Membership CRUD
router.post('/memberships', userController.createMembership);
router.get('/memberships', userController.getMemberships);
router.get('/memberships/:id', userController.getMembershipById);
router.put('/memberships/:id', userController.updateMembership);
router.delete('/memberships/:id', userController.deleteMembership);

router.get('/creators/:creatorId/memberships', userController.getCreatorMemberships);

// Product CRUD
router.post('/products', userController.createProduct);
router.get('/products', userController.getProducts);
router.get('/products/:id', userController.getProductById);
router.put('/products/:id', userController.updateProduct);
router.delete('/products/:id', userController.deleteProduct);

router.get('/creators/:creatorId/products', userController.getCreatorProducts);

// Event CRUD
router.post('/events', userController.createEvent);
router.get('/events', userController.getEvents);
router.get('/events/:id', userController.getEventById);
router.put('/events/:id', userController.updateEvent);
router.delete('/events/:id', userController.deleteEvent);

// Event Interest
router.post('/events/:eventId/interest', userController.toggleEventInterest);

// Get all future events
router.get('/all-events', userController.getAllEvents);
// Subscription routes
router.post('/subscribe', userController.subscribeToCreator);
router.post('/un-subscribe', userController.unSubscribeToCreator);
router.get('/subscriptions', userController.getUserSubscriptions);
router.get('/creators/:creatorId/subscribers', userController.getCreatorSubscribers);

// Stripe checkout session
router.post('/checkout-session', userController.createCheckoutSession);
router.post('/subscriptions/:subscriptionId/cancel', userController.cancelSubscription);

// Insights routes
router.get('/insights', userController.getCreatorInsights);

// Notification routes
router.get('/notifications', userController.getAllNotifications);
router.get('/notifications/unread-count', userController.getUnreadNotificationCount);
router.put('/notifications/:id/read', userController.markNotificationAsRead);
router.put('/notifications/mark-all-read', userController.markAllNotificationsAsRead);

// Group Invites CRUD routes
router.post('/group-invites', userController.createGroupInvite);
router.get('/group-invites', userController.getGroupInvitesByCreatorId);
router.get('/group-invites/:id', userController.getGroupInviteById);
router.put('/group-invites/:id', userController.updateGroupInvite);
router.delete('/group-invites/:id', userController.deleteGroupInvite);

// Email Verification routes
router.post('/send-verification-email', userController.sendVerificationEmail);
router.post('/verify-email', userController.verifyUser);

export { router as userRoutes };
