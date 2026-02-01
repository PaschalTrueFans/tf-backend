import * as express from 'express';
import { AdminController } from '../controller/admin.controller';
import { jwtAdminAuth } from '../middlewares/api-admin-auth';

const router = express.Router();
const adminController = new AdminController();

// Admin routes - all protected with JWT auth
router.use(jwtAdminAuth);

// Dashboard overview
router.get('/dashboard', adminController.getDashboardOverview);
// User Management
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId', adminController.updateUserDetails);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.put('/users/:userId/verify', adminController.verifyUser);
router.put('/users/:userId/role', adminController.updateUserRole);
router.get('/users/:userId/sessions', adminController.getUserSessions);
router.delete('/users/:userId/sessions/:sessionId', adminController.revokeUserSession);
router.get('/users/:userId/audit', adminController.getUserAuditLog);

// Legacy block route - consider deprecating or keeping as alias
router.put('/users/:userId/block', adminController.updateUserBlockStatus);
router.get('/transactions', adminController.getTransactions);
router.get('/tickets', adminController.getTickets);
router.post('/tickets/:ticketId/comments', adminController.addTicketComment);
router.put('/tickets/:ticketId/status', adminController.updateTicketStatus);
router.get('/system-notifications', adminController.getSystemNotifications);
router.post('/system-notifications', adminController.createSystemNotification);
router.put('/system-notifications/:notificationId', adminController.updateSystemNotification);
router.delete('/system-notifications/:notificationId', adminController.deleteSystemNotification);
router.get('/email-broadcasts', adminController.getEmailBroadcasts);
router.post('/email-broadcasts', adminController.createEmailBroadcast);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Community Management
router.get('/communities', adminController.getCommunities);
router.get('/communities/:communityId', adminController.getCommunityDetails);
router.put('/communities/:communityId/status', adminController.updateCommunityStatus);
router.get('/communities/:communityId/members', adminController.getCommunityMembers);

// Content Management
router.get('/posts', adminController.getPosts);
router.get('/posts/:postId', adminController.getPostDetails);
router.delete('/posts/:postId', adminController.deletePost);
router.get('/comments', adminController.getComments);
router.delete('/comments/:commentId', adminController.deleteComment);

// Report Management
router.get('/reports', adminController.getReports);
router.put('/reports/:reportId', adminController.resolveReport);

// Payout management
router.get('/payouts', adminController.getPayouts);
router.get('/payouts/:payoutId', adminController.getPayoutDetails);
router.put('/payouts/:payoutId/approve', adminController.approvePayout);
router.put('/payouts/:payoutId/reject', adminController.rejectPayout);
router.put('/payouts/:payoutId/process', adminController.processPayout);
router.put('/payouts/:payoutId/paid', adminController.markPayoutAsPaid);

// Wallet Management
router.get('/wallets', adminController.getWallets);
router.get('/wallets/:walletId', adminController.getWalletDetails);
router.post('/wallets/:walletId/credit', adminController.creditWallet);
router.post('/wallets/:walletId/debit', adminController.debitWallet);

// Transaction Management
router.post('/transactions/:transactionId/refund', adminController.refundTransaction);

// System & Integrations
router.get('/link-in-bio', adminController.getLinkInBioProfiles);
router.delete('/link-in-bio/:profileId', adminController.deleteLinkInBioProfile);
router.get('/system/admins', adminController.getSystemAdmins);
router.post('/system/admins', adminController.inviteAdmin);
router.delete('/system/admins/:adminId', adminController.removeAdmin);

// Marketplace & Payment Management
router.get('/payments/transactions', adminController.getGlobalTransactions);
router.get('/marketplace/products', adminController.getProducts);
router.put('/marketplace/products/:productId/status', adminController.updateProductStatus);
router.get('/marketplace/orders', adminController.getOrders);
router.get('/marketplace/orders/:orderId', adminController.getOrderDetails);
router.post('/marketplace/orders/:orderId/release-escrow', adminController.releaseEscrow);

// Categories & Settings
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:categoryId', adminController.updateCategory);
router.delete('/categories/:categoryId', adminController.deleteCategory);

export { router as adminRoutes };

