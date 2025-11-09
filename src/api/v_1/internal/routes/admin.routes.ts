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

export { router as adminRoutes };

