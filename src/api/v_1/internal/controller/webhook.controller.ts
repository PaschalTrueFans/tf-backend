import { Request, Response } from 'express';
import { Logger } from '../../../../helpers/logger';
import { stripeService, Entities } from '../../../../helpers';
import { UserService } from '../services/user.service';
import { WalletService } from '../services/wallet.service';
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

        case 'charge.succeeded':
          await this.handleChargeSucceeded(event.data.object as Stripe.Charge, userService);
          break;

        case 'charge.updated':
          await this.handleChargeUpdated(event.data.object as Stripe.Charge, userService);
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
      const metadata = session.metadata || {};
      const type = metadata.type;

      // Initialize WalletService
      // Accessing db from userService which we know is there but might be private. 
      // Safe hack: cast to any or pass db explicitly if we modify signature.
      // Better: WebhookController creates the services properly.
      const db = (userService as any).db as Db;
      const walletService = new WalletService({ db });

      // Handle Coin Purchase
      if (type === 'PURCHASE_COINS') {
        const userId = metadata.userId;
        const { coinAmount, usdCost } = metadata;
        if (!userId || !coinAmount || !usdCost) {
          Logger.error('Missing data in PURCHASE_COINS session', { sessionId: session.id });
          return;
        }
        await walletService.CreditWalletAfterPurchase(userId, parseInt(coinAmount), parseFloat(usdCost), session.id);
        Logger.info('Wallet credited after coin purchase', { userId, coinAmount });
        return;
      }

      // Handle Product Purchase (New Order Flow)
      if (type === 'PRODUCT_PURCHASE' || session.mode === 'payment') {
        const { productId, creatorId, productType, isGuest, guestEmail, guestName } = metadata;
        let userId = metadata.userId;

        if (!productId || !creatorId) {
          Logger.error('Missing data in product purchase session', { sessionId: session.id });
          return;
        }

        // Validate User for non-guest
        if (!isGuest && !userId) {
          // Fallback: try to find user by email
          if (session.customer_email) {
            const user = await db.v1.User.GetUserByEmail(session.customer_email);
            if (user) userId = user.id;
          }
          if (!userId) {
            Logger.error('Missing userId in non-guest checkout session', { sessionId: session.id });
            return;
          }
        }

        // Get Payment Details
        const paymentIntentId = session.payment_intent as string;
        const amount = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || 'USD';

        // Shipping Info
        // Cast session to any because shipping_details might be missing in older Stripe types
        const shipping = (session as any).shipping_details;
        const shippingAddress = shipping ? {
          fullName: shipping.name || guestName || 'Guest',
          address1: shipping.address?.line1 || undefined,
          address2: shipping.address?.line2 || undefined,
          city: shipping.address?.city || undefined,
          state: shipping.address?.state || undefined,
          postalCode: shipping.address?.postal_code || undefined,
          country: shipping.address?.country || undefined,
        } : undefined;

        // Determine Escrow Logic
        const isDigital = productType === 'digital';
        // Escrow logic: Digital = 'released' (immediate), Physical = 'held' (48h)
        const escrowStatus = isDigital ? 'released' : 'held';
        const escrowReleaseAt = isDigital ? undefined : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48h from now

        // Get Product Details for Fee Logic
        const product = await db.v1.User.GetProductById(productId);
        const originalPrice = product ? parseFloat(product.price) : amount;
        const priceWithFee = product ? (product.priceWithFee || originalPrice) : amount;

        // Create Order
        const orderData: Partial<Entities.Order> = {
          userId: userId || undefined,
          guestEmail: userId ? undefined : (guestEmail || session.customer_details?.email || undefined),
          guestName: userId ? undefined : (guestName || session.customer_details?.name || 'Guest'),
          creatorId,
          productId,
          quantity: 1, // Default to 1 for now
          amount,
          currency,
          originalPrice,
          priceWithFee,
          status: 'paid', // Payment successful
          paymentStatus: 'succeeded',
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          shippingAddress,
          digitalAccessGranted: isDigital, // Grant access immediately for digital
          escrowStatus,
          escrowReleaseAt,
          creatorPaidAt: isDigital ? new Date().toISOString() : undefined, // Paid immediately only if digital
        };

        const order = await db.v1.User.CreateOrder(orderData);
        Logger.info('Order created successfully', { orderId: order.orderId, isDigital, escrowStatus });

        // Handle Wallet Credit
        const creditAmount = originalPrice; // Creator gets the base price
        if (isDigital) {
          // Credit Creator Immediately
          await walletService.CreditCreatorForDigitalSale(creatorId, creditAmount, order.orderId);
          Logger.info('Creator credited for digital sale', { creatorId, amount: creditAmount });
        } else {
          // Physical: Funds held in escrow (tracked on Order)
          // Set escrow amount to the original price for later release
          orderData.escrowAmount = creditAmount;
          await db.v1.User.UpdateOrder(order.orderId, { escrowAmount: creditAmount });
          Logger.info('Funds held in escrow for physical sale', { creatorId, amount: creditAmount, releaseAt: escrowReleaseAt });
        }

        // Notify Users (Optional - TODO)
        // await userService.SendOrderConfirmation(order);
        // await userService.SendNewOrderNotification(creatorId, order);

        return;
      }

      // Handle Subscription (Existing Logic)
      if (session.mode === 'subscription') {
        const { membershipId } = session.metadata || {};
        const userId = session.metadata?.userId;
        const creatorId = session.metadata?.creatorId;

        if (!membershipId) {
          Logger.error('Missing membershipId in checkout session', { sessionId: session.id });
          return;
        }

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) return;

        const stripeSubscription = await stripeService.getSubscription(subscriptionId);

        await userService.CreateSubscriptionFromStripe({
          subscriberId: userId as string,
          creatorId: creatorId as string,
          membershipId,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: stripeSubscription.customer as string,
          subscriptionStatus: stripeSubscription.status,
          startedAt: new Date(stripeSubscription.created * 1000),
        });

        Logger.info('Subscription created successfully', { userId, creatorId, membershipId });
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

  private async handleChargeSucceeded(
    charge: Stripe.Charge,
    userService: UserService
  ): Promise<void> {
    Logger.info('Processing charge.succeeded', { chargeId: charge.id, paymentIntentId: charge.payment_intent });

    try {
      if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
        Logger.info('No payment intent found in charge', { chargeId: charge.id });
        return;
      }

      // Use our helper method to determine balance status
      // This method checks the balance transaction's available_on date
      const balanceStatus = await stripeService.getPaymentBalanceStatus(
        charge.payment_intent,
        charge.id,
        new Date(charge.created * 1000)
      );

      await userService.UpdateTransactionBalanceStatus(charge.payment_intent, balanceStatus);
      Logger.info('Transaction balance status updated', {
        chargeId: charge.id,
        paymentIntentId: charge.payment_intent,
        balanceStatus
      });
    } catch (error) {
      Logger.error('Error handling charge.succeeded', error);
    }
  }

  private async handleChargeUpdated(
    charge: Stripe.Charge,
    userService: UserService
  ): Promise<void> {
    Logger.info('Processing charge.updated', { chargeId: charge.id, paymentIntentId: charge.payment_intent });

    try {
      if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
        Logger.info('No payment intent found in charge', { chargeId: charge.id });
        return;
      }

      // Re-check balance status when charge is updated
      // This handles cases where funds become available after the initial charge
      const balanceStatus = await stripeService.getPaymentBalanceStatus(
        charge.payment_intent,
        charge.id,
        new Date(charge.created * 1000)
      );

      await userService.UpdateTransactionBalanceStatus(charge.payment_intent, balanceStatus);
      Logger.info('Transaction balance status updated (charge.updated)', {
        chargeId: charge.id,
        paymentIntentId: charge.payment_intent,
        balanceStatus
      });
    } catch (error) {
      Logger.error('Error handling charge.updated', error);
    }
  }
}
