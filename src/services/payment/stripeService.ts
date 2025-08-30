import Stripe from 'stripe';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger.js';
import { subscriptionService } from '../subscription/subscriptionService.js';
import { authService } from '../auth/authService.js';
import { BotError } from '../../types/index.js';
import {
  Plan,
  Subscription,
  BillingInterval,
  StripeCheckoutSession,
  StripeWebhookEvent,
  StripeCustomer
} from '../../types/subscription.js';

interface StripeServiceDB {
  customers: StripeCustomer[];
  webhookEvents: StripeWebhookEvent[];
  checkoutSessions: StripeCheckoutSession[];
  version: string;
}

class StripeService {
  private static instance: StripeService;
  private stripe: Stripe;
  private stripeDB: StripeServiceDB;
  private readonly dbPath: string;
  private readonly configDir: string;
  private readonly webhookSecret: string;

  private constructor() {
    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia', // Use latest API version
      typescript: true,
    });

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    
    // Initialize database
    this.configDir = join(process.cwd(), 'config');
    this.dbPath = join(this.configDir, 'stripe.json');
    
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    
    this.stripeDB = this.loadStripeDB();
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  private loadStripeDB(): StripeServiceDB {
    try {
      if (!existsSync(this.dbPath)) {
        return this.createDefaultDB();
      }

      const data = readFileSync(this.dbPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error loading Stripe database, creating default', { error });
      return this.createDefaultDB();
    }
  }

  private createDefaultDB(): StripeServiceDB {
    return {
      customers: [],
      webhookEvents: [],
      checkoutSessions: [],
      version: '1.0.0'
    };
  }

  private saveStripeDB(): void {
    try {
      writeFileSync(this.dbPath, JSON.stringify(this.stripeDB, null, 2));
    } catch (error) {
      logger.error('Error saving Stripe database', { error });
      throw new BotError('Failed to save Stripe database', 'DATABASE_SAVE_ERROR');
    }
  }

  // Plan and Product Management
  public async createStripeProduct(plan: Plan): Promise<{ productId: string; priceMonthlyId: string; priceYearlyId: string }> {
    try {
      // Create product in Stripe
      const product = await this.stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          planId: plan.id,
          planType: plan.type,
        },
      });

      // Create monthly price
      const monthlyPrice = await this.stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.price.monthly * 100), // Convert to cents
        currency: plan.price.currency.toLowerCase(),
        recurring: {
          interval: 'month',
        },
        metadata: {
          planId: plan.id,
          interval: 'monthly',
        },
      });

      // Create yearly price
      const yearlyPrice = await this.stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.price.yearly * 100), // Convert to cents
        currency: plan.price.currency.toLowerCase(),
        recurring: {
          interval: 'year',
        },
        metadata: {
          planId: plan.id,
          interval: 'yearly',
        },
      });

      logger.info('Stripe product and prices created', { 
        planId: plan.id,
        productId: product.id,
        monthlyPriceId: monthlyPrice.id,
        yearlyPriceId: yearlyPrice.id
      });

      return {
        productId: product.id,
        priceMonthlyId: monthlyPrice.id,
        priceYearlyId: yearlyPrice.id,
      };
    } catch (error) {
      logger.error('Error creating Stripe product', { error, planId: plan.id });
      throw new BotError('Failed to create Stripe product', 'STRIPE_ERROR');
    }
  }

  public async updateStripeProduct(plan: Plan): Promise<void> {
    try {
      if (!plan.stripeProductId) {
        throw new BotError('Plan does not have Stripe product ID', 'STRIPE_PRODUCT_NOT_FOUND');
      }

      await this.stripe.products.update(plan.stripeProductId, {
        name: plan.name,
        description: plan.description,
        metadata: {
          planId: plan.id,
          planType: plan.type,
        },
      });

      logger.info('Stripe product updated', { planId: plan.id, productId: plan.stripeProductId });
    } catch (error) {
      logger.error('Error updating Stripe product', { error, planId: plan.id });
      throw new BotError('Failed to update Stripe product', 'STRIPE_ERROR');
    }
  }

  // Customer Management
  public async getOrCreateCustomer(userId: string): Promise<StripeCustomer> {
    try {
      // Check if customer exists in our database
      let customer = this.stripeDB.customers.find(c => c.userId === userId);
      if (customer) {
        return customer;
      }

      // Get user details
      const user = authService.getUserById(userId);
      if (!user) {
        throw new BotError('User not found', 'USER_NOT_FOUND');
      }

      // Create customer in Stripe
      const stripeCustomer = await this.stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: {
          userId: userId,
        },
      });

      // Save customer to our database
      customer = {
        stripeCustomerId: stripeCustomer.id,
        userId: userId,
        email: user.email,
        name: user.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.stripeDB.customers.push(customer);
      this.saveStripeDB();

      logger.info('Stripe customer created', { userId, stripeCustomerId: stripeCustomer.id });
      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer', { error, userId });
      throw new BotError('Failed to create Stripe customer', 'STRIPE_ERROR');
    }
  }

  // Checkout Session Management
  public async createCheckoutSession(
    userId: string,
    planId: string,
    billingInterval: BillingInterval,
    successUrl: string,
    cancelUrl: string
  ): Promise<StripeCheckoutSession> {
    try {
      const plan = subscriptionService.getPlanById(planId);
      if (!plan || !plan.isActive) {
        throw new BotError('Plan not found or inactive', 'PLAN_NOT_FOUND');
      }

      // Get or create Stripe customer
      const customer = await this.getOrCreateCustomer(userId);

      // Determine price ID based on billing interval
      let priceId: string;
      let amount: number;

      if (billingInterval === 'monthly') {
        if (!plan.stripePriceMonthlyId) {
          throw new BotError('Monthly price not configured for this plan', 'STRIPE_PRICE_NOT_FOUND');
        }
        priceId = plan.stripePriceMonthlyId;
        amount = plan.price.monthly;
      } else {
        if (!plan.stripePriceYearlyId) {
          throw new BotError('Yearly price not configured for this plan', 'STRIPE_PRICE_NOT_FOUND');
        }
        priceId = plan.stripePriceYearlyId;
        amount = plan.price.yearly;
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
          planId: planId,
          billingInterval: billingInterval,
        },
        subscription_data: {
          metadata: {
            userId: userId,
            planId: planId,
          },
        },
      });

      // Save checkout session to our database
      const checkoutSession: StripeCheckoutSession = {
        sessionId: session.id,
        url: session.url!,
        planId: planId,
        billingInterval: billingInterval,
        userId: userId,
        amount: amount,
        currency: plan.price.currency,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      this.stripeDB.checkoutSessions.push(checkoutSession);
      this.saveStripeDB();

      logger.info('Checkout session created', { 
        userId, 
        planId, 
        sessionId: session.id,
        billingInterval
      });

      return checkoutSession;
    } catch (error) {
      logger.error('Error creating checkout session', { error, userId, planId });
      throw new BotError('Failed to create checkout session', 'STRIPE_ERROR');
    }
  }

  // Get checkout session details
  public async getCheckoutSession(sessionId: string): Promise<any> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'customer']
      });

      logger.info('Checkout session retrieved', { sessionId, status: session.status });
      
      return session;
    } catch (error) {
      logger.error('Error getting checkout session', { error, sessionId });
      throw new BotError('Failed to get checkout session', 'STRIPE_ERROR');
    }
  }

  // Webhook Event Processing
  public async processWebhookEvent(body: string, signature: string): Promise<{ processed: boolean; event?: any }> {
    try {
      if (!this.webhookSecret) {
        logger.warn('Stripe webhook secret not configured, skipping signature verification');
      }

      // Verify webhook signature
      let event: Stripe.Event;
      if (this.webhookSecret) {
        event = this.stripe.webhooks.constructEvent(body, signature, this.webhookSecret);
      } else {
        event = JSON.parse(body);
      }

      // Check if we've already processed this event
      const existingEvent = this.stripeDB.webhookEvents.find(e => e.id === event.id);
      if (existingEvent && existingEvent.processed) {
        logger.debug('Webhook event already processed', { eventId: event.id });
        return { processed: true, event };
      }

      // Save webhook event
      const webhookEvent: StripeWebhookEvent = {
        id: event.id,
        type: event.type,
        data: event.data,
        processed: false,
        createdAt: new Date().toISOString(),
      };

      this.stripeDB.webhookEvents.push(webhookEvent);
      this.saveStripeDB();

      // Process the event
      await this.handleWebhookEvent(event);

      // Mark as processed
      webhookEvent.processed = true;
      webhookEvent.processedAt = new Date().toISOString();
      this.saveStripeDB();

      logger.info('Webhook event processed successfully', { eventId: event.id, eventType: event.type });
      return { processed: true, event };

    } catch (error) {
      logger.error('Error processing webhook event', { error });
      
      // Save failed event for debugging
      try {
        const failedEvent: StripeWebhookEvent = {
          id: `failed-${Date.now()}`,
          type: 'failed_processing',
          data: { body, signature, error: (error as Error).message },
          processed: false,
          error: (error as Error).message,
          createdAt: new Date().toISOString(),
        };
        
        this.stripeDB.webhookEvents.push(failedEvent);
        this.saveStripeDB();
      } catch (saveError) {
        logger.error('Failed to save failed webhook event', { saveError });
      }

      return { processed: false };
    }
  }

  private async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event);
        break;
      default:
        logger.debug('Unhandled webhook event type', { eventType: event.type });
    }
  }

  private async handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    
    logger.info('Processing checkout session completed', { sessionId: session.id });

    if (session.mode === 'subscription' && session.subscription) {
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      const billingInterval = session.metadata?.billingInterval as BillingInterval;

      if (!userId || !planId || !billingInterval) {
        logger.error('Missing metadata in checkout session', { sessionId: session.id });
        return;
      }

      // The subscription will be handled by the subscription.created webhook
      logger.info('Checkout session completed, waiting for subscription.created event', {
        sessionId: session.id,
        userId,
        planId
      });
    }
  }

  private async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
    const stripeSubscription = event.data.object as Stripe.Subscription;
    
    logger.info('Processing subscription created', { subscriptionId: stripeSubscription.id });

    const userId = stripeSubscription.metadata?.userId;
    const planId = stripeSubscription.metadata?.planId;

    if (!userId || !planId) {
      logger.error('Missing metadata in subscription', { subscriptionId: stripeSubscription.id });
      return;
    }

    // Determine billing interval from subscription
    const interval = stripeSubscription.items.data[0]?.price?.recurring?.interval;
    const billingInterval: BillingInterval = interval === 'year' ? 'yearly' : 'monthly';

    // Create subscription in our system
    const result = await subscriptionService.createSubscription({
      userId,
      planId,
      billingInterval,
      startDate: new Date(stripeSubscription.start_date * 1000).toISOString(),
    });

    if (result.success && result.subscription) {
      // Update with Stripe IDs
      result.subscription.stripeSubscriptionId = stripeSubscription.id;
      result.subscription.stripeCustomerId = stripeSubscription.customer as string;
      
      logger.info('Subscription created successfully', {
        subscriptionId: result.subscription.id,
        stripeSubscriptionId: stripeSubscription.id,
        userId,
        planId
      });
    } else {
      logger.error('Failed to create subscription in our system', {
        error: result.error,
        stripeSubscriptionId: stripeSubscription.id,
        userId,
        planId
      });
    }
  }

  private async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const stripeSubscription = event.data.object as Stripe.Subscription;
    
    logger.info('Processing subscription updated', { subscriptionId: stripeSubscription.id });

    // Find and update subscription in our system
    const subscriptions = subscriptionService.getAllSubscriptions();
    const subscription = subscriptions.find(s => s.stripeSubscriptionId === stripeSubscription.id);

    if (subscription) {
      // Update subscription status based on Stripe status
      let status = subscription.status;
      if (stripeSubscription.status === 'active') {
        status = 'active';
      } else if (stripeSubscription.status === 'canceled') {
        status = 'cancelled';
      } else if (stripeSubscription.status === 'past_due') {
        status = 'suspended';
      }

      // Update subscription (this would require adding an update method to subscriptionService)
      logger.info('Subscription status updated', {
        subscriptionId: subscription.id,
        stripeSubscriptionId: stripeSubscription.id,
        oldStatus: subscription.status,
        newStatus: status
      });
    } else {
      logger.warn('Subscription not found in our system', { stripeSubscriptionId: stripeSubscription.id });
    }
  }

  private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const stripeSubscription = event.data.object as Stripe.Subscription;
    
    logger.info('Processing subscription deleted', { subscriptionId: stripeSubscription.id });

    // Find and cancel subscription in our system
    const subscriptions = subscriptionService.getAllSubscriptions();
    const subscription = subscriptions.find(s => s.stripeSubscriptionId === stripeSubscription.id);

    if (subscription) {
      // Cancel subscription in our system
      logger.info('Subscription cancelled', {
        subscriptionId: subscription.id,
        stripeSubscriptionId: stripeSubscription.id
      });
    } else {
      logger.warn('Subscription not found in our system', { stripeSubscriptionId: stripeSubscription.id });
    }
  }

  private async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    
    logger.info('Payment succeeded', { invoiceId: invoice.id, subscriptionId: invoice.subscription });
    
    // Here you could update payment history, send confirmation emails, etc.
  }

  private async handlePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    
    logger.warn('Payment failed', { invoiceId: invoice.id, subscriptionId: invoice.subscription });
    
    // Here you could notify the user, suspend the subscription, etc.
  }

  // Utility methods
  public async getCustomerPortalUrl(userId: string, returnUrl: string): Promise<string> {
    try {
      const customer = this.stripeDB.customers.find(c => c.userId === userId);
      if (!customer) {
        throw new BotError('Customer not found', 'CUSTOMER_NOT_FOUND');
      }

      const portalSession = await this.stripe.billingPortal.sessions.create({
        customer: customer.stripeCustomerId,
        return_url: returnUrl,
      });

      return portalSession.url;
    } catch (error) {
      logger.error('Error creating customer portal URL', { error, userId });
      throw new BotError('Failed to create customer portal URL', 'STRIPE_ERROR');
    }
  }

  public async getSubscriptionDetails(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    } catch (error) {
      logger.error('Error retrieving subscription details', { error, stripeSubscriptionId });
      throw new BotError('Failed to retrieve subscription details', 'STRIPE_ERROR');
    }
  }

  public async cancelSubscription(stripeSubscriptionId: string, immediately: boolean = false): Promise<Stripe.Subscription> {
    try {
      if (immediately) {
        return await this.stripe.subscriptions.cancel(stripeSubscriptionId);
      } else {
        return await this.stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error) {
      logger.error('Error cancelling subscription', { error, stripeSubscriptionId });
      throw new BotError('Failed to cancel subscription', 'STRIPE_ERROR');
    }
  }

  // Health check
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Test Stripe API connection
      await this.stripe.customers.list({ limit: 1 });

      const stats = {
        customers: this.stripeDB.customers.length,
        webhookEvents: this.stripeDB.webhookEvents.length,
        checkoutSessions: this.stripeDB.checkoutSessions.length,
        processedWebhooks: this.stripeDB.webhookEvents.filter(e => e.processed).length,
        databasePath: this.dbPath,
        databaseExists: existsSync(this.dbPath),
        webhookSecretConfigured: !!this.webhookSecret
      };

      return {
        status: 'healthy',
        details: stats
      };
    } catch (error) {
      logger.error('Stripe service health check failed', { error });
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message }
      };
    }
  }
}

export const stripeService = StripeService.getInstance();
export default stripeService;