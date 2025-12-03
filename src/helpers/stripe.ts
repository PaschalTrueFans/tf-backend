import Stripe from 'stripe';
import { Stripe as StripeConfig } from './env';
import { Logger } from './logger';

class StripeService {
  private stripe: Stripe | null = null;

  private getStripe(): Stripe {
    if (!this.stripe) {
      if (!StripeConfig.SECRET_KEY) {
        throw new Error('Stripe secret key is not configured');
      }

      this.stripe = new Stripe(StripeConfig.SECRET_KEY, {
        apiVersion: '2025-10-29.clover',
      });
    }
    return this.stripe;
  }

  /**
   * Create a Stripe product for a membership
   */
  async createProduct(name: string, description?: string): Promise<Stripe.Product> {
    try {
      Logger.info('StripeService.createProduct', { name, description });

      const product = await this.getStripe().products.create({
        name,
        description: description || `Membership: ${name}`,
        type: 'service',
      });

      Logger.info('StripeService.createProduct success', { productId: product.id });
      return product;
    } catch (error) {
      Logger.error('StripeService.createProduct failed', error);
      throw error;
    }
  }

  /**
   * Create a Stripe price for a product (recurring subscription)
   */
  async createPrice(
    productId: string,
    amount: number,
    currency = 'usd'
  ): Promise<Stripe.Price> {
    try {
      Logger.info('StripeService.createPrice', { productId, amount, currency });

      const price = await this.getStripe().prices.create({
        product: productId,
        unit_amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        recurring: {
          interval: 'month',
        },
      });

      Logger.info('StripeService.createPrice success', { priceId: price.id });
      return price;
    } catch (error) {
      Logger.error('StripeService.createPrice failed', error);
      throw error;
    }
  }

  /**
   * Create a one-time Stripe price for a product (non-recurring)
   */
  async createOneTimePrice(
    productId: string,
    amount: number,
    currency = 'ngn'
  ): Promise<Stripe.Price> {
    try {
      Logger.info('StripeService.createOneTimePrice', { productId, amount, currency });

      const price = await this.getStripe().prices.create({
        product: productId,
        unit_amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        // No recurring field = one-time payment
      });

      Logger.info('StripeService.createOneTimePrice success', { priceId: price.id });
      return price;
    } catch (error) {
      Logger.error('StripeService.createOneTimePrice failed', error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    customerEmail?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Checkout.Session> {
    try {
      Logger.info('StripeService.createCheckoutSession', {
        priceId,
        successUrl,
        cancelUrl,
        customerEmail,
        metadata
      });

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadata || {},
      };

      if (customerEmail) {
        sessionParams.customer_email = customerEmail;
      }

      const session = await this.getStripe().checkout.sessions.create(sessionParams);

      Logger.info('StripeService.createCheckoutSession success', { sessionId: session.id });
      return session;
    } catch (error) {
      Logger.error('StripeService.createCheckoutSession failed', error);
      throw error;
    }
  }

  /**
   * Create a checkout session for one-time payment (product purchase)
   */
  async createPaymentCheckoutSession(
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    customerEmail?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Checkout.Session> {
    try {
      Logger.info('StripeService.createPaymentCheckoutSession', {
        priceId,
        successUrl,
        cancelUrl,
        customerEmail,
        metadata
      });

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment', // One-time payment instead of subscription
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadata || {},
      };

      if (customerEmail) {
        sessionParams.customer_email = customerEmail;
      }

      const session = await this.getStripe().checkout.sessions.create(sessionParams);

      Logger.info('StripeService.createPaymentCheckoutSession success', { sessionId: session.id });
      return session;
    } catch (error) {
      Logger.error('StripeService.createPaymentCheckoutSession failed', error);
      throw error;
    }
  }

  /**
   * Retrieve a checkout session
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.getStripe().checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      Logger.error('StripeService.getCheckoutSession failed', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      Logger.info('StripeService.cancelSubscription', { subscriptionId });

      const subscription = await this.getStripe().subscriptions.cancel(subscriptionId);

      Logger.info('StripeService.cancelSubscription success', { subscriptionId });
      return subscription;
    } catch (error) {
      Logger.error('StripeService.cancelSubscription failed', error);
      throw error;
    }
  }

  /**
   * Retrieve a subscription
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.getStripe().subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      Logger.error('StripeService.getSubscription failed', error);
      throw error;
    }
  }

  /**
   * Construct webhook event from raw body and signature
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      return this.getStripe().webhooks.constructEvent(
        payload,
        signature,
        StripeConfig.WEBHOOK_SECRET
      );
    } catch (error) {
      Logger.error('StripeService.constructWebhookEvent failed', error);
      throw error;
    }
  }

  /**
   * Get account balance from Stripe
   * For platform accounts or Connect accounts
   */
  async getBalance(stripeAccountId?: string): Promise<Stripe.Balance> {
    try {
      Logger.info('StripeService.getBalance', { stripeAccountId });

      const balance = stripeAccountId
        ? await this.getStripe().balance.retrieve({ stripeAccount: stripeAccountId })
        : await this.getStripe().balance.retrieve();

      Logger.info('StripeService.getBalance success', {
        available: balance.available,
        pending: balance.pending
      });
      return balance;
    } catch (error) {
      Logger.error('StripeService.getBalance failed', error);
      throw error;
    }
  }

  /**
   * Get customer balance (for customers with account credit)
   */
  async getCustomerBalance(customerId: string): Promise<number> {
    try {
      Logger.info('StripeService.getCustomerBalance', { customerId });

      const customer = await this.getStripe().customers.retrieve(customerId);

      if (customer.deleted) {
        return 0;
      }

      // Customer balance is in cents, negative means credit
      const balance = (customer as Stripe.Customer).balance || 0;

      Logger.info('StripeService.getCustomerBalance success', { balance });
      return balance / 100; // Convert from cents to dollars
    } catch (error) {
      Logger.error('StripeService.getCustomerBalance failed', error);
      throw error;
    }
  }

  /**
   * Get all charges for a customer (to calculate earnings)
   */
  async getCustomerCharges(customerId: string, limit = 100): Promise<Stripe.Charge[]> {
    try {
      Logger.info('StripeService.getCustomerCharges', { customerId, limit });

      const charges = await this.getStripe().charges.list({
        customer: customerId,
        limit,
      });

      Logger.info('StripeService.getCustomerCharges success', { count: charges.data.length });
      return charges.data;
    } catch (error) {
      Logger.error('StripeService.getCustomerCharges failed', error);
      throw error;
    }
  }

  /**
   * Get payment intents for a customer
   */
  async getCustomerPaymentIntents(customerId: string, limit = 100): Promise<Stripe.PaymentIntent[]> {
    try {
      Logger.info('StripeService.getCustomerPaymentIntents', { customerId, limit });

      const paymentIntents = await this.getStripe().paymentIntents.list({
        customer: customerId,
        limit,
      });

      Logger.info('StripeService.getCustomerPaymentIntents success', { count: paymentIntents.data.length });
      return paymentIntents.data;
    } catch (error) {
      Logger.error('StripeService.getCustomerPaymentIntents failed', error);
      throw error;
    }
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      Logger.info('StripeService.getPaymentIntent', { paymentIntentId });

      const paymentIntent = await this.getStripe().paymentIntents.retrieve(paymentIntentId);

      Logger.info('StripeService.getPaymentIntent success', { paymentIntentId });
      return paymentIntent;
    } catch (error) {
      Logger.error('StripeService.getPaymentIntent failed', error);
      throw error;
    }
  }

  /**
   * Get charge by ID
   */
  async getCharge(chargeId: string): Promise<Stripe.Charge> {
    try {
      Logger.info('StripeService.getCharge', { chargeId });

      const charge = await this.getStripe().charges.retrieve(chargeId);

      Logger.info('StripeService.getCharge success', { chargeId });
      return charge;
    } catch (error) {
      Logger.error('StripeService.getCharge failed', error);
      throw error;
    }
  }

  /**
   * Get balance status for a payment (incoming or available)
   * This checks if the payment is available in Stripe balance
   * Rule: If payment succeeded and is older than 7 days, it's available, otherwise incoming
   * Or we can check the actual balance transaction status
   */
  async getPaymentBalanceStatus(paymentIntentId?: string, chargeId?: string, createdAt?: Date): Promise<'incoming' | 'available'> {
    try {
      // If we have a payment intent, check its status and balance transaction
      if (paymentIntentId) {
        const paymentIntent = await this.getPaymentIntent(paymentIntentId);

        // If payment intent is not succeeded, it's still incoming
        if (paymentIntent.status !== 'succeeded') {
          return 'incoming';
        }

        // Check if there's a charge and get its balance transaction
        if (paymentIntent.latest_charge) {
          const charge = await this.getCharge(paymentIntent.latest_charge as string);

          // If charge has a balance transaction, check its status
          if (charge.balance_transaction) {
            const balanceTransaction = await this.getStripe().balanceTransactions.retrieve(
              charge.balance_transaction as string
            );

            // Balance transaction status: available means funds are available
            // pending means funds are still incoming
            if (balanceTransaction.status === 'available') {
              return 'available';
            }
          }
        }
      }

      // If we have a charge ID directly
      if (chargeId) {
        const charge = await this.getCharge(chargeId);

        if (charge.balance_transaction) {
          const balanceTransaction = await this.getStripe().balanceTransactions.retrieve(
            charge.balance_transaction as string
          );

          if (balanceTransaction.status === 'available') {
            return 'available';
          }
        }
      }

      // Fallback: If payment is older than 7 days, assume it's available
      // Otherwise, it's incoming (Stripe typically makes funds available after 2-7 days)
      if (createdAt) {
        const daysSincePayment = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSincePayment >= 7 ? 'available' : 'incoming';
      }

      // Default to incoming if we can't determine
      return 'incoming';
    } catch (error) {
      Logger.error('StripeService.getPaymentBalanceStatus failed', error);
      // Default to incoming on error
      return 'incoming';
    }
  }

  /**
   * Get the Stripe instance for direct access if needed
   */
  getStripeInstance(): Stripe {
    return this.getStripe();
  }
}

export const stripeService = new StripeService();
export default StripeService;
