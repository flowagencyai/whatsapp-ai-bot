import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { subscriptionService } from '../services/subscription/subscriptionService.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/auth.js';
import { requireActiveSubscription, requirePlan } from '../middleware/subscription.js';
import { User } from '../types/auth.js';
import { CreatePlanRequest, UpdatePlanRequest, CreateSubscriptionRequest } from '../types/subscription.js';

export const subscriptionRouter = Router();

// Public routes - Get available plans
subscriptionRouter.get('/plans', async (req, res) => {
  try {
    const plans = subscriptionService.getAllPlans();
    
    res.json({
      success: true,
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        description: plan.description,
        price: plan.price,
        features: plan.features,
        limits: plan.limits,
        isPopular: plan.isPopular
      })),
      total: plans.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting plans', { error });
    res.status(500).json({
      error: 'Failed to get plans',
      details: (error as Error).message
    });
  }
});

// Get specific plan details
subscriptionRouter.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = subscriptionService.getPlanById(planId);
    
    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found'
      });
    }
    
    res.json({
      success: true,
      plan: {
        id: plan.id,
        name: plan.name,
        type: plan.type,
        description: plan.description,
        price: plan.price,
        features: plan.features,
        limits: plan.limits,
        isPopular: plan.isPopular
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting plan details', { error });
    res.status(500).json({
      error: 'Failed to get plan details',
      details: (error as Error).message
    });
  }
});

// Protected routes - require authentication
subscriptionRouter.use(authenticate);

// Get current user's subscription
subscriptionRouter.get('/current', async (req, res) => {
  try {
    const user = req.user as User;
    const subscription = await subscriptionService.getUserActiveSubscription(user.id);
    
    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No active subscription found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          type: subscription.plan.type,
          description: subscription.plan.description,
          price: subscription.plan.price,
          limits: subscription.plan.limits
        },
        status: subscription.status,
        billingInterval: subscription.billingInterval,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        nextBillingDate: subscription.nextBillingDate,
        isTrialPeriod: subscription.isTrialPeriod,
        trialEndsAt: subscription.trialEndsAt,
        currentUsage: subscription.currentUsage,
        amount: subscription.amount,
        currency: subscription.currency
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting current subscription', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to get subscription',
      details: (error as Error).message
    });
  }
});

// Get usage statistics
subscriptionRouter.get('/usage', requireActiveSubscription(), async (req, res) => {
  try {
    const user = req.user as User;
    const subscription = await subscriptionService.getUserActiveSubscription(user.id);
    
    if (!subscription) {
      return res.status(404).json({
        error: 'No active subscription found'
      });
    }
    
    const usage = subscription.currentUsage;
    const limits = subscription.plan.limits;
    
    // Calculate percentages and remaining quotas
    const usageStats = {
      messages: {
        daily: {
          used: usage.messagesUsedToday,
          limit: limits.messagesPerDay,
          remaining: limits.messagesPerDay === -1 ? -1 : Math.max(0, limits.messagesPerDay - usage.messagesUsedToday),
          percentage: limits.messagesPerDay === -1 ? 0 : Math.min(100, (usage.messagesUsedToday / limits.messagesPerDay) * 100)
        },
        monthly: {
          used: usage.messagesUsedThisMonth,
          limit: limits.messagesPerMonth,
          remaining: limits.messagesPerMonth === -1 ? -1 : Math.max(0, limits.messagesPerMonth - usage.messagesUsedThisMonth),
          percentage: limits.messagesPerMonth === -1 ? 0 : Math.min(100, (usage.messagesUsedThisMonth / limits.messagesPerMonth) * 100)
        }
      },
      aiResponses: {
        daily: {
          used: usage.aiResponsesUsedToday,
          limit: limits.aiResponsesPerDay,
          remaining: limits.aiResponsesPerDay === -1 ? -1 : Math.max(0, limits.aiResponsesPerDay - usage.aiResponsesUsedToday),
          percentage: limits.aiResponsesPerDay === -1 ? 0 : Math.min(100, (usage.aiResponsesUsedToday / limits.aiResponsesPerDay) * 100)
        },
        monthly: {
          used: usage.aiResponsesUsedThisMonth,
          limit: limits.aiResponsesPerMonth,
          remaining: limits.aiResponsesPerMonth === -1 ? -1 : Math.max(0, limits.aiResponsesPerMonth - usage.aiResponsesUsedThisMonth),
          percentage: limits.aiResponsesPerMonth === -1 ? 0 : Math.min(100, (usage.aiResponsesUsedThisMonth / limits.aiResponsesPerMonth) * 100)
        }
      },
      audioTranscription: {
        monthly: {
          used: usage.audioTranscriptionMinutesUsedThisMonth,
          limit: limits.audioTranscriptionMinutesPerMonth,
          remaining: limits.audioTranscriptionMinutesPerMonth === -1 ? -1 : Math.max(0, limits.audioTranscriptionMinutesPerMonth - usage.audioTranscriptionMinutesUsedThisMonth),
          percentage: limits.audioTranscriptionMinutesPerMonth === -1 ? 0 : Math.min(100, (usage.audioTranscriptionMinutesUsedThisMonth / limits.audioTranscriptionMinutesPerMonth) * 100)
        }
      },
      imageAnalysis: {
        monthly: {
          used: usage.imageAnalysisUsedThisMonth,
          limit: limits.imageAnalysisPerMonth,
          remaining: limits.imageAnalysisPerMonth === -1 ? -1 : Math.max(0, limits.imageAnalysisPerMonth - usage.imageAnalysisUsedThisMonth),
          percentage: limits.imageAnalysisPerMonth === -1 ? 0 : Math.min(100, (usage.imageAnalysisUsedThisMonth / limits.imageAnalysisPerMonth) * 100)
        }
      },
      storage: {
        used: usage.storageUsedGB,
        limit: limits.storageGB,
        remaining: limits.storageGB === -1 ? -1 : Math.max(0, limits.storageGB - usage.storageUsedGB),
        percentage: limits.storageGB === -1 ? 0 : Math.min(100, (usage.storageUsedGB / limits.storageGB) * 100)
      },
      totals: {
        messagesEverSent: usage.totalMessagesEverSent,
        aiResponsesEverGenerated: usage.totalAiResponsesEverGenerated
      },
      resetDates: {
        dailyResetAt: usage.dailyResetAt,
        monthlyResetAt: usage.monthlyResetAt
      }
    };
    
    res.json({
      success: true,
      usage: usageStats,
      plan: {
        name: subscription.plan.name,
        type: subscription.plan.type
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting usage statistics', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to get usage statistics',
      details: (error as Error).message
    });
  }
});

// Create subscription (self-service)
subscriptionRouter.post('/subscribe', async (req, res) => {
  try {
    const user = req.user as User;
    const { planId, billingInterval, isTrialPeriod, trialDays } = req.body;

    // Validate request
    if (!planId || !billingInterval) {
      return res.status(400).json({
        error: 'Missing required fields: planId, billingInterval'
      });
    }

    // Validate billing interval
    if (!['monthly', 'yearly', 'lifetime'].includes(billingInterval)) {
      return res.status(400).json({
        error: 'Invalid billing interval. Must be monthly, yearly, or lifetime'
      });
    }

    const subscriptionData: CreateSubscriptionRequest = {
      userId: user.id,
      planId,
      billingInterval,
      isTrialPeriod,
      trialDays
    };

    const result = await subscriptionService.createSubscription(subscriptionData);

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }

    logger.info('User subscribed to plan', { 
      userId: user.id, 
      planId, 
      subscriptionId: result.subscription?.id 
    });

    res.status(201).json({
      success: true,
      subscription: result.subscription,
      message: 'Subscription created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error creating subscription', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to create subscription',
      details: (error as Error).message
    });
  }
});

// Check quota for a specific feature
subscriptionRouter.get('/quota/:feature', requireActiveSubscription(), async (req, res) => {
  try {
    const user = req.user as User;
    const { feature } = req.params;
    const amount = parseInt(req.query.amount as string) || 1;

    const quotaCheck = await subscriptionService.checkQuota(user.id, feature, amount);

    res.json({
      success: true,
      quota: quotaCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking quota', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to check quota',
      details: (error as Error).message
    });
  }
});

// Check feature access
subscriptionRouter.get('/features/:featureName', requireActiveSubscription(), async (req, res) => {
  try {
    const user = req.user as User;
    const { featureName } = req.params;

    const featureAccess = await subscriptionService.checkFeatureAccess(user.id, featureName);

    res.json({
      success: true,
      featureAccess,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking feature access', { error, userId: req.user?.id });
    res.status(500).json({
      error: 'Failed to check feature access',
      details: (error as Error).message
    });
  }
});

// Admin routes - require admin permissions
subscriptionRouter.use(requirePermission(['admin_users:write', 'system:write']));

// Create new plan (admin only)
subscriptionRouter.post('/admin/plans', async (req, res) => {
  try {
    const planData: CreatePlanRequest = req.body;

    // Validate required fields
    const requiredFields = ['name', 'type', 'description', 'price', 'features', 'limits'];
    const missingFields = requiredFields.filter(field => !planData[field as keyof CreatePlanRequest]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
    }

    const result = await subscriptionService.createPlan(planData);

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }

    logger.info('New plan created by admin', { 
      adminId: req.user?.id, 
      planId: result.plan?.id,
      planName: result.plan?.name
    });

    res.status(201).json({
      success: true,
      plan: result.plan,
      message: 'Plan created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error creating plan', { error, adminId: req.user?.id });
    res.status(500).json({
      error: 'Failed to create plan',
      details: (error as Error).message
    });
  }
});

// Update plan (admin only)
subscriptionRouter.put('/admin/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const updateData: UpdatePlanRequest = req.body;

    const result = await subscriptionService.updatePlan(planId, updateData);

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }

    logger.info('Plan updated by admin', { 
      adminId: req.user?.id, 
      planId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      plan: result.plan,
      message: 'Plan updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating plan', { error, adminId: req.user?.id, planId: req.params.planId });
    res.status(500).json({
      error: 'Failed to update plan',
      details: (error as Error).message
    });
  }
});

// Delete plan (admin only)
subscriptionRouter.delete('/admin/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;

    const result = subscriptionService.deletePlan(planId);

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }

    logger.info('Plan deleted by admin', { 
      adminId: req.user?.id, 
      planId
    });

    res.json({
      success: true,
      message: 'Plan deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error deleting plan', { error, adminId: req.user?.id, planId: req.params.planId });
    res.status(500).json({
      error: 'Failed to delete plan',
      details: (error as Error).message
    });
  }
});

// Get all subscriptions (admin only)
subscriptionRouter.get('/admin/subscriptions', async (req, res) => {
  try {
    const subscriptions = subscriptionService.getAllSubscriptions();
    
    res.json({
      success: true,
      subscriptions,
      total: subscriptions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting all subscriptions', { error, adminId: req.user?.id });
    res.status(500).json({
      error: 'Failed to get subscriptions',
      details: (error as Error).message
    });
  }
});

// Get user subscriptions (admin only)
subscriptionRouter.get('/admin/users/:userId/subscriptions', async (req, res) => {
  try {
    const { userId } = req.params;
    const subscriptions = subscriptionService.getSubscriptionsByUserId(userId);
    
    res.json({
      success: true,
      subscriptions,
      userId,
      total: subscriptions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting user subscriptions', { error, adminId: req.user?.id, userId: req.params.userId });
    res.status(500).json({
      error: 'Failed to get user subscriptions',
      details: (error as Error).message
    });
  }
});

// Subscription service health check
subscriptionRouter.get('/admin/health', async (req, res) => {
  try {
    const health = await subscriptionService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Subscription service health check failed', { error });
    res.status(500).json({
      error: 'Health check failed',
      details: (error as Error).message
    });
  }
});