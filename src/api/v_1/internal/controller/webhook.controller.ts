import { Request, Response } from 'express';
import { Logger } from '../../../../helpers/logger';
import { stripeService } from '../../../../helpers';
import { UserService } from '../services/user.service';
import { Db } from '../../../../database/db';
import Stripe from 'stripe';

export class WebhookController {
  constructor() {
    Logger.info('Webhook controller initialized...');
  }

  public stripeWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      Logger.error('Missing stripe-signature header');
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    try {
      // Construct the event from the raw body and signature
      const event = stripeService.constructWebhookEvent(req.body, signature);
      
      Logger.info('Stripe webhook received', { 
        eventType: event.type, 
        eventId: event.id 
      });

      const db = res.locals.db as Db;
      const userService = new UserService({ db });

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, userService);
          break;
          
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, userService);
          break;
          
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, userService);
          break;
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription, userService);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription, userService);
          break;
          
        default:
          Logger.info('Unhandled webhook event type', { eventType: event.type });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      Logger.error('Stripe webhook error', error);
      res.status(400).send('Webhook error');
    }
  };

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session, 
    userService: UserService
  ): Promise<void> {
    Logger.info('Processing checkout.session.completed', { sessionId: session.id, mode: session.mode });

    try {
      const { userId, creatorId } = session.metadata || {};
      
      if (!userId || !creatorId) {
        Logger.error('Missing metadata in checkout session', { sessionId: session.id });
        return;
      }

      // Check if this is a product purchase (mode: 'payment') or subscription (mode: 'subscription')
      if (session.mode === 'payment') {
        // Handle product purchase
        const { productId } = session.metadata || {};
        
        if (!productId) {
          Logger.error('Missing productId in checkout session metadata', { sessionId: session.id });
          return;
        }

        // Get payment intent details
        const paymentIntentId = session.payment_intent as string;
        let paymentIntent = null;
        let chargeId = null;
        let customerId = session.customer as string || null;

        if (paymentIntentId) {
          try {
            const stripe = stripeService.getStripeInstance();
            paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            chargeId = typeof paymentIntent.latest_charge === 'string' 
              ? paymentIntent.latest_charge 
              : paymentIntent.latest_charge?.id || null;
            customerId = customerId || (typeof paymentIntent.customer === 'string' 
              ? paymentIntent.customer 
              : paymentIntent.customer?.id || null);
          } catch (error) {
            Logger.error('Error retrieving payment intent', error);
          }
        }

        // Get amount from session
        const amount = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || 'NGN';

        // Create product purchase record
        await userService.CreateProductPurchaseFromStripe({
          userId,
          productId,
          creatorId,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId || undefined,
          stripeChargeId: chargeId || undefined,
          stripeCustomerId: customerId || undefined,
          amount,
          currency,
          status: session.payment_status === 'paid' ? 'completed' : 'pending',
        });

        // Create transaction record
        await userService.CreateTransactionFromProductPurchase({
          userId,
          productId,
          creatorId,
          stripePaymentIntentId: paymentIntentId || undefined,
          stripeChargeId: chargeId || undefined,
          stripeCustomerId: customerId || undefined,
          amount,
          currency,
          status: session.payment_status === 'paid' ? 'succeeded' : 'pending',
        });

        Logger.info('Product purchase created successfully', { 
          userId, 
          creatorId, 
          productId, 
          sessionId: session.id 
        });
      } else if (session.mode === 'subscription') {
        // Handle subscription (existing logic)
        const { membershipId } = session.metadata || {};
        
        if (!membershipId) {
          Logger.error('Missing membershipId in checkout session', { sessionId: session.id });
          return;
        }

        // Get the subscription from Stripe
        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          Logger.error('No subscription ID in checkout session', { sessionId: session.id });
          return;
        }

        const stripeSubscription = await stripeService.getSubscription(subscriptionId);
        
        // Create subscription in our database
        await userService.CreateSubscriptionFromStripe({
          subscriberId: userId,
          creatorId,
          membershipId,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: stripeSubscription.customer as string,
          subscriptionStatus: stripeSubscription.status,
          startedAt: new Date(stripeSubscription.created * 1000),
        });

        Logger.info('Subscription created successfully', { 
          userId, 
          creatorId, 
          membershipId, 
          subscriptionId 
        });
      }
    } catch (error) {
      Logger.error('Error handling checkout.session.completed', error);
    }
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice, 
    userService: UserService
  ): Promise<void> {
    Logger.info('Processing invoice.payment_succeeded', { invoiceId: invoice.id });

    try {
      // Access subscription property safely - it can be string, Subscription object, or null
      const subscription = (invoice as any).subscription;
      const subscriptionId = typeof subscription === 'string' 
        ? subscription 
        : subscription?.id || null;
      
      if (!subscriptionId) {
        Logger.info('No subscription ID found in invoice', { invoiceId: invoice.id });
        return;
      }

      // Update subscription status to active
      await userService.UpdateSubscriptionStatus(subscriptionId, 'active');
      
      // Create transaction record
      await userService.CreateTransactionFromInvoice(invoice, subscriptionId);
      
      Logger.info('Subscription status updated to active and transaction created', { subscriptionId });
    } catch (error) {
      Logger.error('Error handling invoice.payment_succeeded', error);
    }
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice, 
    userService: UserService
  ): Promise<void> {
    Logger.info('Processing invoice.payment_failed', { invoiceId: invoice.id });

    try {
      // Access subscription property safely - it can be string, Subscription object, or null
      const subscription = (invoice as any).subscription;
      const subscriptionId = typeof subscription === 'string' 
        ? subscription 
        : subscription?.id || null;
      
      if (!subscriptionId) {
        Logger.info('No subscription ID found in invoice', { invoiceId: invoice.id });
        return;
      }

      // Update subscription status to past_due
      await userService.UpdateSubscriptionStatus(subscriptionId, 'past_due');
      
      Logger.info('Subscription status updated to past_due', { subscriptionId });
    } catch (error) {
      Logger.error('Error handling invoice.payment_failed', error);
    }
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription, 
    userService: UserService
  ): Promise<void> {
    Logger.info('Processing customer.subscription.updated', { subscriptionId: subscription.id });

    try {
      // Update subscription status
      await userService.UpdateSubscriptionStatus(subscription.id, subscription.status);
      
      Logger.info('Subscription status updated', { 
        subscriptionId: subscription.id, 
        status: subscription.status 
      });
    } catch (error) {
      Logger.error('Error handling customer.subscription.updated', error);
    }
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription, 
    userService: UserService
  ): Promise<void> {
    Logger.info('Processing customer.subscription.deleted', { subscriptionId: subscription.id });

    try {
      // Mark subscription as canceled
      await userService.UpdateSubscriptionStatus(subscription.id, 'canceled', new Date());
      
      Logger.info('Subscription marked as canceled', { subscriptionId: subscription.id });
    } catch (error) {
      Logger.error('Error handling customer.subscription.deleted', error);
    }
  }
}
