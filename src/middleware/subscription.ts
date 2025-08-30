import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { subscriptionService } from '../services/subscription/subscriptionService.js';
import { User } from '../types/auth.js';
import { PlanType } from '../types/subscription.js';

// Extend Request type to include subscription info
declare module 'express-serve-static-core' {
  interface Request {
    subscription?: any;
    quotaCheck?: any;
  }
}

/**
 * Middleware to check if user has an active subscription
 */
export const requireActiveSubscription = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const subscription = await subscriptionService.getUserActiveSubscription(user.id);
      
      if (!subscription) {
        return res.status(403).json({
          error: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'You need an active subscription to access this feature',
          upgradeUrl: '/subscription/plans'
        });
      }

      // Add subscription to request for later use
      req.subscription = subscription;
      
      next();
    } catch (error) {
      logger.error('Error in requireActiveSubscription middleware', { error });
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if user's plan includes specific plan types
 */
export const requirePlan = (allowedPlans: PlanType[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const subscription = await subscriptionService.getUserActiveSubscription(user.id);
      
      if (!subscription) {
        return res.status(403).json({
          error: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'You need an active subscription to access this feature',
          requiredPlans: allowedPlans,
          upgradeUrl: '/subscription/plans'
        });
      }

      if (!allowedPlans.includes(subscription.plan.type)) {
        return res.status(403).json({
          error: 'Plan upgrade required',
          code: 'PLAN_UPGRADE_REQUIRED',
          message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}`,
          currentPlan: subscription.plan.type,
          requiredPlans: allowedPlans,
          upgradeUrl: '/subscription/plans'
        });
      }

      // Add subscription to request for later use
      req.subscription = subscription;
      
      next();
    } catch (error) {
      logger.error('Error in requirePlan middleware', { error });
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check feature access
 */
export const requireFeature = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const featureAccess = await subscriptionService.checkFeatureAccess(user.id, featureName);
      
      if (!featureAccess.hasAccess) {
        return res.status(403).json({
          error: 'Feature access denied',
          code: 'FEATURE_ACCESS_DENIED',
          message: featureAccess.reason,
          feature: featureName,
          upgradeRequired: featureAccess.upgradeRequired,
          upgradeUrl: featureAccess.upgradeRequired ? '/subscription/plans' : undefined
        });
      }

      next();
    } catch (error) {
      logger.error('Error in requireFeature middleware', { error });
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check quota before allowing action
 */
export const requireQuota = (feature: string, amount: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const quotaCheck = await subscriptionService.checkQuota(user.id, feature, amount);
      
      if (!quotaCheck.allowed) {
        return res.status(429).json({
          error: 'Quota exceeded',
          code: 'QUOTA_EXCEEDED',
          message: `You have exceeded your ${feature} quota`,
          quota: {
            feature,
            limit: quotaCheck.limit,
            used: quotaCheck.used,
            remaining: quotaCheck.remaining,
            resetsAt: quotaCheck.resetsAt
          },
          upgradeRequired: quotaCheck.upgradeRequired,
          upgradeUrl: quotaCheck.upgradeRequired ? '/subscription/plans' : undefined
        });
      }

      // Add quota check to request for later use
      req.quotaCheck = quotaCheck;
      
      next();
    } catch (error) {
      logger.error('Error in requireQuota middleware', { error });
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check multiple quotas at once
 */
export const requireMultipleQuotas = (quotaChecks: Array<{ feature: string; amount?: number }>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const quotaResults = await Promise.all(
        quotaChecks.map(check => 
          subscriptionService.checkQuota(user.id, check.feature, check.amount || 1)
        )
      );

      const failedQuotas = quotaResults.filter(result => !result.allowed);

      if (failedQuotas.length > 0) {
        return res.status(429).json({
          error: 'One or more quotas exceeded',
          code: 'MULTIPLE_QUOTAS_EXCEEDED',
          message: 'You have exceeded quotas for one or more features',
          failedQuotas: failedQuotas.map(quota => ({
            feature: quota.feature,
            limit: quota.limit,
            used: quota.used,
            remaining: quota.remaining,
            resetsAt: quota.resetsAt
          })),
          upgradeRequired: failedQuotas.some(q => q.upgradeRequired),
          upgradeUrl: '/subscription/plans'
        });
      }

      // Add all quota checks to request for later use
      req.quotaCheck = quotaResults;
      
      next();
    } catch (error) {
      logger.error('Error in requireMultipleQuotas middleware', { error });
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to track usage after successful request
 * This should be used after the main handler
 */
export const trackUsage = (feature: 'messages' | 'aiResponses' | 'audioTranscription' | 'imageAnalysis' | 'storage', amount: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store the original json method
    const originalJson = res.json;

    // Override res.json to track usage after successful response
    res.json = function (body: any) {
      // Call the original json method
      const result = originalJson.call(this, body);

      // Track usage only if response was successful (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = req.user as User;
        if (user) {
          subscriptionService.incrementUsage({
            feature,
            amount,
            userId: user.id,
            metadata: {
              endpoint: req.path,
              method: req.method,
              timestamp: new Date().toISOString()
            }
          }).catch(error => {
            logger.error('Error tracking usage', { error, feature, amount, userId: user.id });
          });
        }
      }

      return result;
    };

    next();
  };
};

/**
 * Middleware to add subscription info to response headers
 */
export const addSubscriptionHeaders = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      
      if (user) {
        const subscription = await subscriptionService.getUserActiveSubscription(user.id);
        
        if (subscription) {
          res.set({
            'X-Subscription-Plan': subscription.plan.type,
            'X-Subscription-Status': subscription.status,
            'X-Plan-Name': subscription.plan.name,
            'X-Messages-Remaining': Math.max(0, subscription.plan.limits.messagesPerDay - subscription.currentUsage.messagesUsedToday).toString(),
            'X-AI-Responses-Remaining': Math.max(0, subscription.plan.limits.aiResponsesPerDay - subscription.currentUsage.aiResponsesUsedToday).toString()
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Error in addSubscriptionHeaders middleware', { error });
      // Don't fail the request, just continue without headers
      next();
    }
  };
};

/**
 * Helper function to check if user has unlimited access to a feature
 */
export const hasUnlimitedAccess = (subscription: any, feature: string): boolean => {
  if (!subscription || !subscription.plan) return false;
  
  const limits = subscription.plan.limits;
  
  switch (feature) {
    case 'messages':
      return limits.messagesPerDay === -1 && limits.messagesPerMonth === -1;
    case 'aiResponses':
      return limits.aiResponsesPerDay === -1 && limits.aiResponsesPerMonth === -1;
    case 'audioTranscription':
      return limits.audioTranscriptionMinutesPerMonth === -1;
    case 'imageAnalysis':
      return limits.imageAnalysisPerMonth === -1;
    case 'storage':
      return limits.storageGB === -1;
    default:
      return false;
  }
};

/**
 * Middleware specifically for WhatsApp message processing
 */
export const requireMessageQuota = () => {
  return requireMultipleQuotas([
    { feature: 'messagesPerDay', amount: 1 },
    { feature: 'messagesPerMonth', amount: 1 }
  ]);
};

/**
 * Middleware specifically for AI response generation
 */
export const requireAIQuota = () => {
  return requireMultipleQuotas([
    { feature: 'aiResponsesPerDay', amount: 1 },
    { feature: 'aiResponsesPerMonth', amount: 1 }
  ]);
};