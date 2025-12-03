import * as express from 'express';
import { LinkInBioController } from '../controller/link-in-bio.controller';
import { jwtAuth } from '../middlewares/api-auth';

const router = express.Router();
const linkInBioController = new LinkInBioController();

// Public routes (no auth required)
router.post('/track/view/:username', linkInBioController.trackView);
router.post('/track/click', linkInBioController.trackClick);
router.get('/:username/links', linkInBioController.getPublicProfile);
router.get('/slug/:slug', linkInBioController.getProfileBySlug);

// Protected routes (auth required)
router.use(jwtAuth);

router.get('/my-profile/get', linkInBioController.getMyProfile);
router.put('/my-profile/update', linkInBioController.updateProfile);
router.post('/publish', linkInBioController.publishProfile);
router.get('/analytics/get', linkInBioController.getAnalytics);

export { router as linkInBioRoutes };
