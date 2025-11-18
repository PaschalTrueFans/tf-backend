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
    currency: string = 'usd'
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
    currency: string = 'ngn'
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
   * Get the Stripe instance for direct access if needed
   */
  getStripeInstance(): Stripe {
    return this.getStripe();
  }
}

export const stripeService = new StripeService();
export default StripeService;
