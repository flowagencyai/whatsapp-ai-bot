import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/auth/authService.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { LoginRequest, CreateUserRequest, RefreshTokenRequest } from '../types/auth.js';
import { logger } from '../utils/logger.js';

const authRouter = Router();

// Rate limiting for auth endpoints (relaxed for development)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for auth endpoint', { 
      ip: req.ip, 
      path: req.path,
      userAgent: req.get('user-agent')
    });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

const strictAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Stricter limit for login attempts
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  }
});

// Apply rate limiting to auth routes
authRouter.use(authLimiter);

/**
 * POST /auth/login
 * User login
 */
authRouter.post('/login', strictAuthLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const loginData: LoginRequest = req.body;
    
    // Validate required fields
    if (!loginData.username || !loginData.password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
      return;
    }

    // Sanitize input
    loginData.username = loginData.username.trim().toLowerCase();
    
    logger.info('Login attempt', { 
      username: loginData.username, 
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    const result = await authService.login(loginData);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokenType: 'Bearer'
        },
        message: 'Login successful',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error,
        code: 'LOGIN_FAILED',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('Login endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
authRouter.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;
    
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokenType: 'Bearer'
        },
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error,
        code: 'REFRESH_FAILED',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('Token refresh endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /auth/logout
 * User logout (invalidate tokens)
 */
authRouter.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    // In a production system, you might want to maintain a blacklist of invalidated tokens
    // For now, we just log the logout and let the client handle token removal
    
    logger.info('User logout', { 
      userId: req.user?.id, 
      username: req.user?.username 
    });

    res.json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Logout endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /auth/me
 * Get current user information
 */
authRouter.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: req.user
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Get current user endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /auth/password
 * Change user password
 */
authRouter.put('/password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password, new password, and confirmation are required',
        code: 'MISSING_PASSWORD_DATA'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: 'New password and confirmation do not match',
        code: 'PASSWORD_MISMATCH'
      });
      return;
    }

    // TODO: Implement password change in authService
    res.status(501).json({
      success: false,
      error: 'Password change not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });
    
  } catch (error) {
    logger.error('Change password endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /auth/users
 * Get all users (admin only)
 */
authRouter.get('/users', authenticate, requirePermission('admin_users:read'), async (req: Request, res: Response): Promise<void> => {
  try {
    const users = authService.getAllUsers();
    
    res.json({
      success: true,
      data: {
        users,
        total: users.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Get users endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /auth/users
 * Create new user (admin only)
 */
authRouter.post('/users', authenticate, requirePermission('admin_users:write'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserRequest = req.body;
    
    // Validate required fields
    if (!userData.username || !userData.email || !userData.password || !userData.role) {
      res.status(400).json({
        success: false,
        error: 'Username, email, password, and role are required',
        code: 'MISSING_USER_DATA'
      });
      return;
    }

    // Sanitize input
    userData.username = userData.username.trim().toLowerCase();
    userData.email = userData.email.trim().toLowerCase();
    
    const result = await authService.createUser(userData);
    
    if (result.success) {
      logger.info('New user created', { 
        createdBy: req.user?.username,
        newUser: userData.username,
        role: userData.role
      });
      
      res.status(201).json({
        success: true,
        data: {
          user: result.user
        },
        message: 'User created successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: 'USER_CREATION_FAILED',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('Create user endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /auth/permissions
 * Get current user's permissions
 */
authRouter.get('/permissions', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        permissions: req.user.permissions,
        role: req.user.role
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Get permissions endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /auth/security-settings
 * Get security settings (admin only)
 */
authRouter.get('/security-settings', authenticate, requirePermission('system:read'), async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = authService.getSecuritySettings();
    
    res.json({
      success: true,
      data: {
        settings
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Get security settings endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /auth/verify-email
 * Verify user email with token
 */
authRouter.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Token de verificação é obrigatório',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    const result = await authService.verifyEmail(token);

    if (result.success) {
      // Redirecionar para página de sucesso
      res.redirect(`http://localhost:3001/auth/email-verified?message=${encodeURIComponent(result.message)}`);
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        code: 'VERIFICATION_FAILED'
      });
    }
  } catch (error) {
    logger.error('Email verification endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar email',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * POST /auth/resend-verification
 * Resend verification email
 */
authRouter.post('/resend-verification', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const result = await authService.resendVerificationEmail(req.user.userId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        code: 'RESEND_FAILED'
      });
    }
  } catch (error) {
    logger.error('Resend verification endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Erro ao reenviar email de verificação',
      code: 'SERVER_ERROR'
    });
  }
});

export default authRouter;

export { authRouter };