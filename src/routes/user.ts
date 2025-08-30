import { Router, Request, Response, NextFunction } from 'express';
import { personalizationService } from '../services/personalization/personalizationService.js';
import { UserPersonalizationConfig } from '../types/admin.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

/**
 * User API Routes
 * For regular users to manage their own personalization
 */
const userRouter = Router();

// Apply authentication to all user routes
userRouter.use(authenticate);

// User API middleware for logging
const userMiddleware = (req: Request, res: Response, next: NextFunction) => {
  logger.info('User API request', {
    method: req.method,
    path: req.path,
    user: req.user ? { id: req.user.id, username: req.user.username, role: req.user.role } : undefined
  });
  next();
};

userRouter.use(userMiddleware);

/**
 * GET /api/user/personalization
 * Get current user's personalization config
 */
userRouter.get('/personalization', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.phone || req.user?.id || 'unknown';
    const userPhone = userId;
    
    const config = personalizationService.getUserConfig(userId, userPhone);

    const response = {
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get user personalization', { 
      error: error as Error,
      userId: req.user?.id
    });

    const response = {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * PUT /api/user/personalization
 * Update current user's personalization config
 */
userRouter.put('/personalization', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.phone || req.user?.id || 'unknown';
    const userPhone = userId;
    const updates = req.body;
    const updatedBy = req.user?.username || 'user';

    // Ensure user config exists first
    personalizationService.getUserConfig(userId, userPhone);
    
    const updatedConfig = personalizationService.updateUserConfig(userId, updates, updatedBy);

    const response = {
      success: true,
      data: updatedConfig,
      message: 'Personalização atualizada com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to update user personalization', { 
      error: error as Error,
      userId: req.user?.id
    });

    const response = {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/user/personalization/reset
 * Reset current user's personalization to defaults
 */
userRouter.post('/personalization/reset', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.phone || req.user?.id || 'unknown';
    const userPhone = userId;
    const updatedBy = req.user?.username || 'user';

    // Delete current config and get fresh default
    personalizationService.deleteUserConfig(userId);
    const defaultConfig = personalizationService.getUserConfig(userId, userPhone);
    
    // Update the updatedBy field
    const resetConfig = personalizationService.updateUserConfig(userId, {}, updatedBy);

    const response = {
      success: true,
      data: resetConfig,
      message: 'Personalização resetada para os padrões',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to reset user personalization', { 
      error: error as Error,
      userId: req.user?.id
    });

    const response = {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/user/profile
 * Get current user's profile information
 */
userRouter.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Remove sensitive information
    const { password, ...safeUserData } = user;

    const response = {
      success: true,
      data: safeUserData,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get user profile', { 
      error: error as Error,
      userId: req.user?.id
    });

    const response = {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

// Error handler for user routes
const userErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('User API error', {
    error,
    method: req.method,
    path: req.path,
    userId: req.user?.id
  });

  const response = {
    success: false,
    error: error.message,
    timestamp: new Date().toISOString()
  };

  res.status(500).json(response);
};

// Apply error handler
userRouter.use(userErrorHandler);

export { userRouter };