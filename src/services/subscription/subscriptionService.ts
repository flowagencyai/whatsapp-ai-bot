import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger.js';
import { Redis } from '../memory/redisClient.js';
import { BotError } from '../../types/index.js';
import {
  Plan,
  Subscription,
  PlanType,
  SubscriptionStatus,
  BillingInterval,
  UsageStats,
  QuotaCheck,
  FeatureAccess,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  UsageIncrement,
  DEFAULT_PLANS,
  FEATURE_FLAGS
} from '../../types/subscription.js';

interface SubscriptionDB {
  plans: Plan[];
  subscriptions: Subscription[];
  version: string;
}

class SubscriptionService {
  private static instance: SubscriptionService;
  private subscriptionDB: SubscriptionDB;
  private readonly dbPath: string;
  private readonly configDir: string;

  private constructor() {
    this.configDir = join(process.cwd(), 'config');
    this.dbPath = join(this.configDir, 'subscriptions.json');
    
    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    
    this.subscriptionDB = this.loadSubscriptionDB();
    this.ensureDefaultPlans();
  }

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  private loadSubscriptionDB(): SubscriptionDB {
    try {
      if (!existsSync(this.dbPath)) {
        return this.createDefaultDB();
      }

      const data = readFileSync(this.dbPath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Migrate old format if needed
      if (!parsed.version) {
        return this.migrateDatabase(parsed);
      }
      
      return parsed;
    } catch (error) {
      logger.error('Error loading subscription database, creating default', { error });
      return this.createDefaultDB();
    }
  }

  private createDefaultDB(): SubscriptionDB {
    return {
      plans: [],
      subscriptions: [],
      version: '1.0.0'
    };
  }

  private migrateDatabase(oldData: any): SubscriptionDB {
    logger.info('Migrating subscription database to new format');
    
    const newDB = this.createDefaultDB();
    
    if (oldData.plans && Array.isArray(oldData.plans)) {
      newDB.plans = oldData.plans;
    }
    
    if (oldData.subscriptions && Array.isArray(oldData.subscriptions)) {
      newDB.subscriptions = oldData.subscriptions;
    }
    
    this.saveSubscriptionDB(newDB);
    return newDB;
  }

  private saveSubscriptionDB(db?: SubscriptionDB): void {
    try {
      const dataToSave = db || this.subscriptionDB;
      writeFileSync(this.dbPath, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      logger.error('Error saving subscription database', { error });
      throw new BotError('Failed to save subscription database', 'DATABASE_SAVE_ERROR');
    }
  }

  private ensureDefaultPlans(): void {
    if (this.subscriptionDB.plans.length === 0) {
      logger.info('Creating default plans');
      
      DEFAULT_PLANS.forEach(planData => {
        const plan: Plan = {
          ...planData,
          id: `plan-${planData.type}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.subscriptionDB.plans.push(plan);
      });
      
      this.saveSubscriptionDB();
      logger.info('Default plans created successfully');
    }
  }

  // Plan Management
  public async createPlan(planData: CreatePlanRequest): Promise<{ success: boolean; plan?: Plan; error?: string }> {
    try {
      // Check if plan with same name exists
      const existingPlan = this.subscriptionDB.plans.find(p => p.name === planData.name);
      if (existingPlan) {
        return { success: false, error: 'Plan with this name already exists' };
      }

      const newPlan: Plan = {
        id: `plan-${planData.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...planData,
        isActive: planData.isActive ?? true,
        isPopular: planData.isPopular ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.subscriptionDB.plans.push(newPlan);
      this.saveSubscriptionDB();

      logger.info('New plan created', { planId: newPlan.id, planName: newPlan.name });
      
      return { success: true, plan: newPlan };
    } catch (error) {
      logger.error('Error creating plan', { error });
      return { success: false, error: 'Failed to create plan' };
    }
  }

  public async updatePlan(planId: string, updateData: UpdatePlanRequest): Promise<{ success: boolean; plan?: Plan; error?: string }> {
    try {
      const planIndex = this.subscriptionDB.plans.findIndex(p => p.id === planId);
      if (planIndex === -1) {
        return { success: false, error: 'Plan not found' };
      }

      const plan = this.subscriptionDB.plans[planIndex];
      
      // Update plan data
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof UpdatePlanRequest] !== undefined) {
          (plan as any)[key] = updateData[key as keyof UpdatePlanRequest];
        }
      });
      
      plan.updatedAt = new Date().toISOString();
      
      this.saveSubscriptionDB();

      logger.info('Plan updated', { planId, changes: Object.keys(updateData) });
      
      return { success: true, plan };
    } catch (error) {
      logger.error('Error updating plan', { error, planId });
      return { success: false, error: 'Failed to update plan' };
    }
  }

  public deletePlan(planId: string): { success: boolean; error?: string } {
    try {
      const planIndex = this.subscriptionDB.plans.findIndex(p => p.id === planId);
      if (planIndex === -1) {
        return { success: false, error: 'Plan not found' };
      }

      // Check if plan has active subscriptions
      const activeSubscriptions = this.subscriptionDB.subscriptions.filter(
        s => s.planId === planId && s.status === 'active'
      );
      
      if (activeSubscriptions.length > 0) {
        return { success: false, error: 'Cannot delete plan with active subscriptions' };
      }

      this.subscriptionDB.plans.splice(planIndex, 1);
      this.saveSubscriptionDB();

      logger.info('Plan deleted', { planId });
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting plan', { error, planId });
      return { success: false, error: 'Failed to delete plan' };
    }
  }

  // Subscription Management
  public async createSubscription(subscriptionData: CreateSubscriptionRequest): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    try {
      const plan = this.subscriptionDB.plans.find(p => p.id === subscriptionData.planId);
      if (!plan || !plan.isActive) {
        return { success: false, error: 'Plan not found or inactive' };
      }

      // Check if user already has an active subscription
      const existingSubscription = this.subscriptionDB.subscriptions.find(
        s => s.userId === subscriptionData.userId && s.status === 'active'
      );
      
      if (existingSubscription) {
        return { success: false, error: 'User already has an active subscription' };
      }

      const startDate = subscriptionData.startDate ? new Date(subscriptionData.startDate) : new Date();
      const isTrialPeriod = subscriptionData.isTrialPeriod ?? false;
      const trialDays = subscriptionData.trialDays ?? 7;

      let endDate: Date | undefined;
      let trialEndsAt: Date | undefined;
      let nextBillingDate: Date | undefined;

      if (isTrialPeriod) {
        trialEndsAt = new Date(startDate.getTime() + (trialDays * 24 * 60 * 60 * 1000));
        nextBillingDate = trialEndsAt;
      } else {
        // Calculate next billing date based on interval
        if (subscriptionData.billingInterval === 'monthly') {
          nextBillingDate = new Date(startDate);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else if (subscriptionData.billingInterval === 'yearly') {
          nextBillingDate = new Date(startDate);
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }
      }

      const newSubscription: Subscription = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: subscriptionData.userId,
        planId: subscriptionData.planId,
        plan,
        status: 'active',
        billingInterval: subscriptionData.billingInterval,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString(),
        nextBillingDate: nextBillingDate?.toISOString(),
        isTrialPeriod,
        trialEndsAt: trialEndsAt?.toISOString(),
        currentUsage: this.createInitialUsageStats(),
        amount: subscriptionData.billingInterval === 'yearly' ? plan.price.yearly : plan.price.monthly,
        currency: plan.price.currency,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.subscriptionDB.subscriptions.push(newSubscription);
      this.saveSubscriptionDB();

      // Cache subscription data in Redis
      await this.cacheSubscriptionData(subscriptionData.userId, newSubscription);

      logger.info('New subscription created', { 
        subscriptionId: newSubscription.id, 
        userId: subscriptionData.userId,
        planName: plan.name
      });
      
      return { success: true, subscription: newSubscription };
    } catch (error) {
      logger.error('Error creating subscription', { error });
      return { success: false, error: 'Failed to create subscription' };
    }
  }

  private createInitialUsageStats(): UsageStats {
    const now = new Date().toISOString();
    return {
      messagesUsedToday: 0,
      messagesUsedThisMonth: 0,
      aiResponsesUsedToday: 0,
      aiResponsesUsedThisMonth: 0,
      audioTranscriptionMinutesUsedThisMonth: 0,
      imageAnalysisUsedThisMonth: 0,
      storageUsedGB: 0,
      dailyResetAt: now,
      monthlyResetAt: now,
      totalMessagesEverSent: 0,
      totalAiResponsesEverGenerated: 0
    };
  }

  private async cacheSubscriptionData(userId: string, subscription: Subscription): Promise<void> {
    try {
      await Redis.setex(`subscription:${userId}`, 3600, JSON.stringify(subscription));
    } catch (error) {
      logger.warn('Failed to cache subscription data', { error, userId });
    }
  }

  // Usage Tracking and Quota Management
  public async incrementUsage(increment: UsageIncrement): Promise<{ success: boolean; usage?: UsageStats; error?: string }> {
    try {
      const subscription = await this.getUserActiveSubscription(increment.userId);
      if (!subscription) {
        return { success: false, error: 'No active subscription found' };
      }

      // Check if we need to reset daily/monthly counters
      await this.resetUsageIfNeeded(subscription);

      // Increment usage
      switch (increment.feature) {
        case 'messages':
          subscription.currentUsage.messagesUsedToday += increment.amount;
          subscription.currentUsage.messagesUsedThisMonth += increment.amount;
          subscription.currentUsage.totalMessagesEverSent += increment.amount;
          break;
        case 'aiResponses':
          subscription.currentUsage.aiResponsesUsedToday += increment.amount;
          subscription.currentUsage.aiResponsesUsedThisMonth += increment.amount;
          subscription.currentUsage.totalAiResponsesEverGenerated += increment.amount;
          break;
        case 'audioTranscription':
          subscription.currentUsage.audioTranscriptionMinutesUsedThisMonth += increment.amount;
          break;
        case 'imageAnalysis':
          subscription.currentUsage.imageAnalysisUsedThisMonth += increment.amount;
          break;
        case 'storage':
          subscription.currentUsage.storageUsedGB = increment.amount; // Set absolute value for storage
          break;
      }

      subscription.updatedAt = new Date().toISOString();

      // Update in database
      const subscriptionIndex = this.subscriptionDB.subscriptions.findIndex(s => s.id === subscription.id);
      if (subscriptionIndex !== -1) {
        this.subscriptionDB.subscriptions[subscriptionIndex] = subscription;
        this.saveSubscriptionDB();
      }

      // Update cache
      await this.cacheSubscriptionData(increment.userId, subscription);

      return { success: true, usage: subscription.currentUsage };
    } catch (error) {
      logger.error('Error incrementing usage', { error, increment });
      return { success: false, error: 'Failed to increment usage' };
    }
  }

  private async resetUsageIfNeeded(subscription: Subscription): Promise<void> {
    const now = new Date();
    const dailyReset = new Date(subscription.currentUsage.dailyResetAt);
    const monthlyReset = new Date(subscription.currentUsage.monthlyResetAt);

    // Reset daily counters if needed
    if (now.getDate() !== dailyReset.getDate() || now.getMonth() !== dailyReset.getMonth() || now.getFullYear() !== dailyReset.getFullYear()) {
      subscription.currentUsage.messagesUsedToday = 0;
      subscription.currentUsage.aiResponsesUsedToday = 0;
      subscription.currentUsage.dailyResetAt = now.toISOString();
    }

    // Reset monthly counters if needed
    if (now.getMonth() !== monthlyReset.getMonth() || now.getFullYear() !== monthlyReset.getFullYear()) {
      subscription.currentUsage.messagesUsedThisMonth = 0;
      subscription.currentUsage.aiResponsesUsedThisMonth = 0;
      subscription.currentUsage.audioTranscriptionMinutesUsedThisMonth = 0;
      subscription.currentUsage.imageAnalysisUsedThisMonth = 0;
      subscription.currentUsage.monthlyResetAt = now.toISOString();
    }
  }

  public async checkQuota(userId: string, feature: string, amount: number = 1): Promise<QuotaCheck> {
    try {
      const subscription = await this.getUserActiveSubscription(userId);
      if (!subscription) {
        return {
          feature,
          allowed: false,
          limit: 0,
          used: 0,
          remaining: 0,
          upgradeRequired: true
        };
      }

      const plan = subscription.plan;
      let limit: number;
      let used: number;
      let resetsAt: string | undefined;

      switch (feature) {
        case 'messagesPerDay':
          limit = plan.limits.messagesPerDay;
          used = subscription.currentUsage.messagesUsedToday;
          resetsAt = this.getNextDayReset();
          break;
        case 'messagesPerMonth':
          limit = plan.limits.messagesPerMonth;
          used = subscription.currentUsage.messagesUsedThisMonth;
          resetsAt = this.getNextMonthReset();
          break;
        case 'aiResponsesPerDay':
          limit = plan.limits.aiResponsesPerDay;
          used = subscription.currentUsage.aiResponsesUsedToday;
          resetsAt = this.getNextDayReset();
          break;
        case 'aiResponsesPerMonth':
          limit = plan.limits.aiResponsesPerMonth;
          used = subscription.currentUsage.aiResponsesUsedThisMonth;
          resetsAt = this.getNextMonthReset();
          break;
        case 'audioTranscriptionMinutesPerMonth':
          limit = plan.limits.audioTranscriptionMinutesPerMonth;
          used = subscription.currentUsage.audioTranscriptionMinutesUsedThisMonth;
          resetsAt = this.getNextMonthReset();
          break;
        case 'imageAnalysisPerMonth':
          limit = plan.limits.imageAnalysisPerMonth;
          used = subscription.currentUsage.imageAnalysisUsedThisMonth;
          resetsAt = this.getNextMonthReset();
          break;
        case 'storageGB':
          limit = plan.limits.storageGB;
          used = subscription.currentUsage.storageUsedGB;
          break;
        default:
          return {
            feature,
            allowed: false,
            limit: 0,
            used: 0,
            remaining: 0,
            upgradeRequired: true
          };
      }

      // -1 means unlimited
      if (limit === -1) {
        return {
          feature,
          allowed: true,
          limit: -1,
          used,
          remaining: -1,
          resetsAt,
          upgradeRequired: false
        };
      }

      const remaining = Math.max(0, limit - used);
      const allowed = remaining >= amount;

      return {
        feature,
        allowed,
        limit,
        used,
        remaining,
        resetsAt,
        upgradeRequired: !allowed
      };
    } catch (error) {
      logger.error('Error checking quota', { error, userId, feature });
      return {
        feature,
        allowed: false,
        limit: 0,
        used: 0,
        remaining: 0,
        upgradeRequired: true
      };
    }
  }

  private getNextDayReset(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }

  private getNextMonthReset(): string {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.toISOString();
  }

  public async checkFeatureAccess(userId: string, featureName: string): Promise<FeatureAccess> {
    try {
      const subscription = await this.getUserActiveSubscription(userId);
      if (!subscription) {
        return {
          feature: featureName,
          hasAccess: false,
          reason: 'No active subscription',
          upgradeRequired: true
        };
      }

      const featureFlag = FEATURE_FLAGS[featureName.toUpperCase()];
      if (!featureFlag || !featureFlag.enabled) {
        return {
          feature: featureName,
          hasAccess: false,
          reason: 'Feature not available',
          upgradeRequired: false
        };
      }

      const plan = subscription.plan;
      const hasAccess = featureFlag.requiredPlan ? featureFlag.requiredPlan.includes(plan.type) : true;

      return {
        feature: featureName,
        hasAccess,
        reason: hasAccess ? undefined : `Feature requires ${featureFlag.requiredPlan?.join(' or ')} plan`,
        upgradeRequired: !hasAccess
      };
    } catch (error) {
      logger.error('Error checking feature access', { error, userId, featureName });
      return {
        feature: featureName,
        hasAccess: false,
        reason: 'Error checking feature access',
        upgradeRequired: false
      };
    }
  }

  // Getters
  public getAllPlans(): Plan[] {
    return this.subscriptionDB.plans.filter(p => p.isActive);
  }

  public getPlanById(planId: string): Plan | null {
    return this.subscriptionDB.plans.find(p => p.id === planId) || null;
  }

  public async getUserActiveSubscription(userId: string): Promise<Subscription | null> {
    try {
      // Try to get from cache first
      const cached = await Redis.get(`subscription:${userId}`);
      if (cached) {
        const subscription = JSON.parse(cached) as Subscription;
        // Verify it's still active and not expired
        if (subscription.status === 'active' && !this.isSubscriptionExpired(subscription)) {
          return subscription;
        }
      }

      // Get from database
      const subscription = this.subscriptionDB.subscriptions.find(
        s => s.userId === userId && s.status === 'active'
      );

      if (!subscription) {
        return null;
      }

      // Check if subscription is expired
      if (this.isSubscriptionExpired(subscription)) {
        await this.expireSubscription(subscription.id);
        return null;
      }

      // Populate plan data if not already there
      if (!subscription.plan) {
        const plan = this.getPlanById(subscription.planId);
        if (plan) {
          subscription.plan = plan;
        }
      }

      // Cache the subscription
      await this.cacheSubscriptionData(userId, subscription);

      return subscription;
    } catch (error) {
      logger.error('Error getting user active subscription', { error, userId });
      return null;
    }
  }

  private isSubscriptionExpired(subscription: Subscription): boolean {
    if (!subscription.endDate) return false;
    return new Date(subscription.endDate) < new Date();
  }

  private async expireSubscription(subscriptionId: string): Promise<void> {
    const subscriptionIndex = this.subscriptionDB.subscriptions.findIndex(s => s.id === subscriptionId);
    if (subscriptionIndex !== -1) {
      this.subscriptionDB.subscriptions[subscriptionIndex].status = 'expired';
      this.subscriptionDB.subscriptions[subscriptionIndex].updatedAt = new Date().toISOString();
      this.saveSubscriptionDB();
      
      // Remove from cache
      const userId = this.subscriptionDB.subscriptions[subscriptionIndex].userId;
      await Redis.del(`subscription:${userId}`);
      
      logger.info('Subscription expired', { subscriptionId, userId });
    }
  }

  public getAllSubscriptions(): Subscription[] {
    return this.subscriptionDB.subscriptions;
  }

  public getSubscriptionsByUserId(userId: string): Subscription[] {
    return this.subscriptionDB.subscriptions.filter(s => s.userId === userId);
  }

  // Health check
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const stats = {
        totalPlans: this.subscriptionDB.plans.length,
        activePlans: this.subscriptionDB.plans.filter(p => p.isActive).length,
        totalSubscriptions: this.subscriptionDB.subscriptions.length,
        activeSubscriptions: this.subscriptionDB.subscriptions.filter(s => s.status === 'active').length,
        databasePath: this.dbPath,
        databaseExists: existsSync(this.dbPath)
      };

      return {
        status: 'healthy',
        details: stats
      };
    } catch (error) {
      logger.error('Subscription service health check failed', { error });
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message }
      };
    }
  }
}

export const subscriptionService = SubscriptionService.getInstance();
export default subscriptionService;