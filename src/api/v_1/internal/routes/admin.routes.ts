import * as express from 'express';
import { AdminController } from '../controller/admin.controller';
import { jwtAuth } from '../middlewares/api-auth';

const router = express.Router();
const adminController = new AdminController();

// Admin routes - all protected with JWT auth
router.use(jwtAuth);

// Dashboard overview
router.get('/dashboard', adminController.getDashboardOverview);

export { router as adminRoutes };

