import { Router, Request, Response, NextFunction } from 'express';
import { adminConfigManager } from '@/services/admin/configManager';
import { adminStatsManager } from '@/services/admin/statsManager';
import { AdminApiResponse, AdminConfigUpdate, AdminBulkAction } from '@/types/admin';
import { logger } from '@/utils/logger';

/**
 * Admin API Routes
 * Completely isolated from main bot functionality
 * These endpoints provide administrative control over the bot
 */
const adminRouter = Router();

// Admin API middleware for logging and error handling
const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  logger.info('Admin API request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
};

// Error handler for admin routes
const adminErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Admin API error', {
    error,
    method: req.method,
    path: req.path
  });

  const response: AdminApiResponse = {
    success: false,
    error: error.message,
    timestamp: new Date().toISOString()
  };

  res.status(500).json(response);
};

// Apply middleware
adminRouter.use(adminMiddleware);

/**
 * GET /admin/config
 * Get current admin configuration
 */
adminRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const config = adminConfigManager.getConfig();
    
    const response: AdminApiResponse = {
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /admin/config
 * Update admin configuration
 */
adminRouter.put('/config', async (req: Request, res: Response) => {
  try {
    const update: AdminConfigUpdate = req.body;
    
    if (!update.section || !update.field || update.value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: section, field, value',
        timestamp: new Date().toISOString()
      });
    }

    update.admin = update.admin || 'admin-interface';
    
    const updatedConfig = await adminConfigManager.updateConfig(update);

    const response: AdminApiResponse = {
      success: true,
      data: updatedConfig,
      message: 'Configuration updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /admin/config/:section
 * Update entire configuration section
 */
adminRouter.put('/config/:section', async (req: Request, res: Response) => {
  try {
    const { section } = req.params;
    const data = req.body.data;
    const admin = req.body.admin || 'admin-interface';

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Missing configuration data',
        timestamp: new Date().toISOString()
      });
    }

    const updatedConfig = await adminConfigManager.updateSection(
      section as any, 
      data, 
      admin
    );

    const response: AdminApiResponse = {
      success: true,
      data: updatedConfig,
      message: `Configuration section '${section}' updated successfully`,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * POST /admin/config/reset
 * Reset configuration to defaults
 */
adminRouter.post('/config/reset', async (req: Request, res: Response) => {
  try {
    const admin = req.body.admin || 'admin-interface';
    const resetConfig = await adminConfigManager.resetToDefaults(admin);

    const response: AdminApiResponse = {
      success: true,
      data: resetConfig,
      message: 'Configuration reset to defaults',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * POST /admin/config/backup
 * Create configuration backup
 */
adminRouter.post('/config/backup', async (req: Request, res: Response) => {
  try {
    const backupPath = await adminConfigManager.createBackup();

    const response: AdminApiResponse = {
      success: true,
      data: { backupPath },
      message: 'Configuration backup created',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * GET /admin/stats
 * Get comprehensive system statistics
 */
adminRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await adminStatsManager.getSystemStats();

    const response: AdminApiResponse = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * GET /admin/users
 * Get all active users with their information
 */
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await adminStatsManager.getActiveUsers();

    const response: AdminApiResponse = {
      success: true,
      data: users,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * GET /admin/users/:userId/memory
 * Get memory information for specific user
 */
adminRouter.get('/users/:userId/memory', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const memory = await adminStatsManager.getUserMemory(userId);

    if (!memory) {
      return res.status(404).json({
        success: false,
        error: 'User not found or no memory data available',
        timestamp: new Date().toISOString()
      });
    }

    const response: AdminApiResponse = {
      success: true,
      data: memory,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * DELETE /admin/users/:userId/memory
 * Clear memory for specific user
 */
adminRouter.delete('/users/:userId/memory', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const admin = req.body.admin || 'admin-interface';
    
    const success = await adminStatsManager.clearUserMemory(userId, admin);

    const response: AdminApiResponse = {
      success,
      message: success ? 'User memory cleared successfully' : 'Failed to clear user memory',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * POST /admin/users/:userId/pause
 * Pause specific user
 */
adminRouter.post('/users/:userId/pause', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { duration = 3600000 } = req.body; // Default 1 hour
    const admin = req.body.admin || 'admin-interface';
    
    const success = await adminStatsManager.pauseUser(userId, duration, admin);

    const response: AdminApiResponse = {
      success,
      message: success ? 'User paused successfully' : 'Failed to pause user',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * POST /admin/users/:userId/resume
 * Resume specific user
 */
adminRouter.post('/users/:userId/resume', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const admin = req.body.admin || 'admin-interface';
    
    const success = await adminStatsManager.resumeUser(userId, admin);

    const response: AdminApiResponse = {
      success,
      message: success ? 'User resumed successfully' : 'Failed to resume user',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * POST /admin/bulk-actions
 * Perform bulk actions on users
 */
adminRouter.post('/bulk-actions', async (req: Request, res: Response) => {
  try {
    const action: AdminBulkAction = req.body;
    const admin = req.body.admin || 'admin-interface';

    let result: any = {};
    let message = '';

    switch (action.action) {
      case 'clear_memory':
        if (action.userIds && action.userIds.length > 0) {
          // Clear memory for specific users
          const results = await Promise.allSettled(
            action.userIds.map(userId => adminStatsManager.clearUserMemory(userId, admin))
          );
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
          result = { totalUsers: action.userIds.length, successCount };
          message = `Cleared memory for ${successCount}/${action.userIds.length} users`;
        } else {
          // Clear all memories
          const clearedCount = await adminStatsManager.clearAllMemories(admin);
          result = { clearedCount };
          message = `Cleared memory for ${clearedCount} users`;
        }
        break;

      case 'pause_users':
        if (!action.userIds || action.userIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'User IDs required for pause action',
            timestamp: new Date().toISOString()
          });
        }
        
        const pauseResults = await Promise.allSettled(
          action.userIds.map(userId => 
            adminStatsManager.pauseUser(userId, action.duration || 3600000, admin)
          )
        );
        const pauseSuccessCount = pauseResults.filter(r => r.status === 'fulfilled' && r.value).length;
        result = { totalUsers: action.userIds.length, successCount: pauseSuccessCount };
        message = `Paused ${pauseSuccessCount}/${action.userIds.length} users`;
        break;

      case 'resume_users':
        if (!action.userIds || action.userIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'User IDs required for resume action',
            timestamp: new Date().toISOString()
          });
        }
        
        const resumeResults = await Promise.allSettled(
          action.userIds.map(userId => adminStatsManager.resumeUser(userId, admin))
        );
        const resumeSuccessCount = resumeResults.filter(r => r.status === 'fulfilled' && r.value).length;
        result = { totalUsers: action.userIds.length, successCount: resumeSuccessCount };
        message = `Resumed ${resumeSuccessCount}/${action.userIds.length} users`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid bulk action',
          timestamp: new Date().toISOString()
        });
    }

    const response: AdminApiResponse = {
      success: true,
      data: result,
      message,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * GET /admin/health
 * Admin-specific health check
 */
adminRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = await adminStatsManager.getSystemStats();

    const response: AdminApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        services: stats.services,
        uptime: stats.system.uptime,
        memory: stats.system.memoryUsage
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    const response: AdminApiResponse = {
      success: false,
      data: {
        status: 'unhealthy'
      },
      error: error.message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

// Apply error handler
adminRouter.use(adminErrorHandler);

export { adminRouter };