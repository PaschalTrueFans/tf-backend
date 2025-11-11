import * as express from 'express';
import { AdminController } from '../controller/admin.controller';
import { jwtAdminAuth } from '../middlewares/api-admin-auth';

const router = express.Router();
const adminController = new AdminController();

// Admin routes - all protected with JWT auth
router.use(jwtAdminAuth);

// Dashboard overview
router.get('/dashboard', adminController.getDashboardOverview);
router.get('/users', adminController.getUsers);
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

export { router as adminRoutes };

