import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { stripeService } from '../services/payment/stripeService.js';
import { subscriptionService } from '../services/subscription/subscriptionService.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/auth.js';
import { User } from '../types/auth.js';
import { BillingInterval } from '../types/subscription.js';

export const paymentRouter = Router();

// Public webhook endpoint (must be before authentication middleware)
paymentRouter.post('/stripe/webhook', async (req, res) => {
  try {
    const signature = req.get('stripe-signature');
    if (!signature) {
      return res.status(400).json({
        error: 'Missing Stripe signature'
      });
    }

    const body = JSON.stringify(req.body);
    const result = await stripeService.processWebhookEvent(body, signature);

    if (result.processed) {
      res.json({ received: true });
    } else {
      res.status(400).json({ error: 'Failed to process webhook' });
    }
  } catch (error) {
    logger.error('Stripe webhook error', { error });
    res.status(400).json({
      error: 'Webhook processing failed',
      details: (error as Error).message
    });
  }
});

// Protected routes
paymentRouter.use(authenticate);

// Create checkout session for plan subscription
paymentRouter.post('/checkout/create', async (req, res) => {
  try {
    const user = req.user as User;
    const { planId, billingInterval } = req.body;

    if (!planId || !billingInterval) {
      return res.status(400).json({
        error: 'Missing required fields: planId, billingInterval'
      });
    }

    if (!['monthly', 'yearly'].includes(billingInterval)) {
      return res.status(400).json({
        error: 'Invalid billing interval. Must be monthly or yearly'
      });
    }

    // Get plan details
    const plan = subscriptionService.getPlanById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        error: 'Plan not found or inactive'
      });
    }

    // Check if user already has active subscription
    const existingSubscription = await subscriptionService.getUserActiveSubscription(user.id);
    if (existingSubscription) {
      return res.status(400).json({
        error: 'User already has an active subscription',
        currentPlan: existingSubscription.plan.name
      });
    }

    // Create Stripe product and prices if not exists
    if (!plan.stripeProductId) {
      const stripeProduct = await stripeService.createStripeProduct(plan);
      
      // Update plan with Stripe IDs (this would require updating subscriptionService)
      logger.info('Plan needs Stripe product created', { 
        planId, 
        stripeProductId: stripeProduct.productId 
      });
      
      // For now, we'll assume the plan has Stripe IDs
      // In production, you'd update the plan in the database
    }

    // Create checkout session
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const successUrl = `${baseUrl}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/dashboard/subscription/plans`;

    const checkoutSession = await stripeService.createCheckoutSession(
      user.id,
      planId,
      billingInterval as BillingInterval,
      successUrl,
      cancelUrl
    );

    logger.info('Checkout session created', { 
      userId: user.id, 
      planId, 
      sessionId: checkoutSession.sessionId 
    });

    res.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.sessionId,
      plan: {
        name: plan.name,
        amount: checkoutSession.amount,
        currency: checkoutSession.currency,
        interval: billingInterval
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating checkout session', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: (error as Error).message
    });
  }
});

// Get customer portal URL for subscription management
paymentRouter.get('/customer-portal', async (req, res) => {
  try {
    const user = req.user as User;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const returnUrl = `${baseUrl}/dashboard/subscription`;

    const portalUrl = await stripeService.getCustomerPortalUrl(user.id, returnUrl);

    res.json({
      success: true,
      portalUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating customer portal URL', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to create customer portal URL',
      details: (error as Error).message
    });
  }
});

// Get checkout session details
paymentRouter.get('/session/:sessionId', async (req, res) => {
  try {
    const user = req.user as User;
    const { sessionId } = req.params;

    // Get session details from Stripe
    const session = await stripeService.getCheckoutSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Checkout session not found'
      });
    }

    // Verify the session belongs to this user (security check)
    if (session.client_reference_id !== user.id) {
      return res.status(403).json({
        error: 'Session does not belong to current user'
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        amount: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        planId: session.metadata?.planId,
        planName: session.metadata?.planName,
        billingInterval: session.metadata?.billingInterval,
        createdAt: new Date(session.created * 1000).toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting checkout session', { error, sessionId: req.params.sessionId, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to get checkout session',
      details: (error as Error).message
    });
  }
});

// Get payment methods for user
paymentRouter.get('/payment-methods', async (req, res) => {
  try {
    const user = req.user as User;
    
    // This would get payment methods from Stripe
    // For now, return empty array
    res.json({
      success: true,
      paymentMethods: [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting payment methods', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to get payment methods',
      details: (error as Error).message
    });
  }
});

// Cancel subscription
paymentRouter.post('/subscription/cancel', async (req, res) => {
  try {
    const user = req.user as User;
    const { immediately = false } = req.body;

    const subscription = await subscriptionService.getUserActiveSubscription(user.id);
    if (!subscription) {
      return res.status(404).json({
        error: 'No active subscription found'
      });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({
        error: 'Subscription not managed by Stripe'
      });
    }

    const stripeSubscription = await stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      immediately
    );

    logger.info('Subscription cancelled', { 
      userId: user.id, 
      subscriptionId: subscription.id,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      immediately
    });

    res.json({
      success: true,
      message: immediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of the billing period',
      cancellationDate: immediately 
        ? new Date().toISOString() 
        : new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error cancelling subscription', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to cancel subscription',
      details: (error as Error).message
    });
  }
});

// Admin routes
paymentRouter.use(requirePermission(['admin_users:write', 'system:write']));

// Sync plans with Stripe (create missing products/prices)
paymentRouter.post('/admin/sync-plans', async (req, res) => {
  try {
    const plans = subscriptionService.getAllPlans();
    const results = [];

    for (const plan of plans) {
      if (!plan.stripeProductId) {
        try {
          const stripeProduct = await stripeService.createStripeProduct(plan);
          results.push({
            planId: plan.id,
            success: true,
            stripeProductId: stripeProduct.productId,
            stripePriceMonthlyId: stripeProduct.priceMonthlyId,
            stripePriceYearlyId: stripeProduct.priceYearlyId
          });

          logger.info('Plan synced with Stripe', { 
            planId: plan.id,
            stripeProductId: stripeProduct.productId
          });
        } catch (error) {
          results.push({
            planId: plan.id,
            success: false,
            error: (error as Error).message
          });
        }
      } else {
        results.push({
          planId: plan.id,
          success: true,
          message: 'Plan already synced'
        });
      }
    }

    res.json({
      success: true,
      results,
      totalPlans: plans.length,
      syncedPlans: results.filter(r => r.success).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error syncing plans with Stripe', { error, adminId: req.user?.id });
    res.status(500).json({
      error: 'Failed to sync plans',
      details: (error as Error).message
    });
  }
});

// Get all Stripe customers
paymentRouter.get('/admin/customers', async (req, res) => {
  try {
    // This would get customers from the Stripe database
    // For now, return empty array
    res.json({
      success: true,
      customers: [],
      total: 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting Stripe customers', { error, adminId: req.user?.id });
    res.status(500).json({
      error: 'Failed to get customers',
      details: (error as Error).message
    });
  }
});

// Get webhook events for debugging
paymentRouter.get('/admin/webhook-events', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    // This would get webhook events from the Stripe database
    // For now, return empty array
    res.json({
      success: true,
      events: [],
      total: 0,
      limit: Number(limit),
      offset: Number(offset),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting webhook events', { error, adminId: req.user?.id });
    res.status(500).json({
      error: 'Failed to get webhook events',
      details: (error as Error).message
    });
  }
});

// Stripe service health check
paymentRouter.get('/admin/health', async (req, res) => {
  try {
    const health = await stripeService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Stripe service health check failed', { error });
    res.status(500).json({
      error: 'Health check failed',
      details: (error as Error).message
    });
  }
});