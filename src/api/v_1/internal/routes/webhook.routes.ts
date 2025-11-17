import { Router } from 'express';
import { WebhookController } from '../controller/webhook.controller';

const router = Router();
const webhookController = new WebhookController();

// Stripe webhook endpoint (raw body required)
router.post('/stripe', webhookController.stripeWebhook);

export default router;
