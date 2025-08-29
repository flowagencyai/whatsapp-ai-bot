import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth/authService.js';
import { Permission, User } from '../types/auth.js';
import { logger } from '../utils/logger.js';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const tokenPayload = authService.verifyAccessToken(token);
    
    if (!tokenPayload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Get fresh user data
    const user = authService.getUserById(tokenPayload.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
      return;
    }

    // Attach user to request
    req.user = user;
    
    logger.debug('User authenticated', { 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    });
    
    next();
    
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Authorization middleware factory - checks permissions
 */
export const requirePermission = (permission: Permission) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      if (!authService.hasPermission(req.user, permission)) {
        logger.warn('Permission denied', { 
          userId: req.user.id, 
          username: req.user.username, 
          requiredPermission: permission,
          userPermissions: req.user.permissions
        });
        
        res.status(403).json({
          success: false,
          error: `Permission denied. Required: ${permission}`,
          code: 'PERMISSION_DENIED',
          requiredPermission: permission
        });
        return;
      }

      logger.debug('Permission granted', { 
        userId: req.user.id, 
        permission 
      });
      
      next();
      
    } catch (error) {
      logger.error('Authorization error', { error });
      res.status(500).json({
        success: false,
        error: 'Authorization failed',
        code: 'AUTHZ_ERROR'
      });
    }
  };
};

/**
 * Authorization middleware factory - checks if user has any of the permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      if (!authService.hasAnyPermission(req.user, permissions)) {
        logger.warn('Permission denied - none of required permissions', { 
          userId: req.user.id, 
          username: req.user.username, 
          requiredPermissions: permissions,
          userPermissions: req.user.permissions
        });
        
        res.status(403).json({
          success: false,
          error: `Permission denied. Required one of: ${permissions.join(', ')}`,
          code: 'PERMISSION_DENIED',
          requiredPermissions: permissions
        });
        return;
      }

      next();
      
    } catch (error) {
      logger.error('Authorization error', { error });
      res.status(500).json({
        success: false,
        error: 'Authorization failed',
        code: 'AUTHZ_ERROR'
      });
    }
  };
};

/**
 * Authorization middleware factory - checks if user has all permissions
 */
export const requireAllPermissions = (permissions: Permission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      if (!authService.hasAllPermissions(req.user, permissions)) {
        logger.warn('Permission denied - missing required permissions', { 
          userId: req.user.id, 
          username: req.user.username, 
          requiredPermissions: permissions,
          userPermissions: req.user.permissions
        });
        
        res.status(403).json({
          success: false,
          error: `Permission denied. Required all: ${permissions.join(', ')}`,
          code: 'PERMISSION_DENIED',
          requiredPermissions: permissions
        });
        return;
      }

      next();
      
    } catch (error) {
      logger.error('Authorization error', { error });
      res.status(500).json({
        success: false,
        error: 'Authorization failed',
        code: 'AUTHZ_ERROR'
      });
    }
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Role access denied', { 
          userId: req.user.id, 
          username: req.user.username, 
          userRole: req.user.role,
          requiredRoles: allowedRoles
        });
        
        res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          code: 'ROLE_DENIED',
          requiredRoles: allowedRoles
        });
        return;
      }

      next();
      
    } catch (error) {
      logger.error('Role authorization error', { error });
      res.status(500).json({
        success: false,
        error: 'Authorization failed',
        code: 'AUTHZ_ERROR'
      });
    }
  };
};

/**
 * Optional authentication middleware - adds user if token is valid but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);
    const tokenPayload = authService.verifyAccessToken(token);
    
    if (tokenPayload) {
      const user = authService.getUserById(tokenPayload.userId);
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
    
  } catch (error) {
    // Log error but continue - optional auth shouldn't block requests
    logger.debug('Optional auth failed', { error: (error as Error).message });
    next();
  }
};

/**
 * Middleware to check if user can access their own resources or has admin permissions
 */
export const requireOwnershipOrPermission = (permission: Permission, getUserId: (req: Request) => string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      const resourceUserId = getUserId(req);
      
      // Allow if user is accessing their own resource
      if (req.user.id === resourceUserId) {
        next();
        return;
      }

      // Allow if user has the required permission
      if (authService.hasPermission(req.user, permission)) {
        next();
        return;
      }

      logger.warn('Access denied - not owner and insufficient permissions', { 
        userId: req.user.id, 
        username: req.user.username, 
        resourceUserId,
        requiredPermission: permission
      });
      
      res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources or need admin permissions.',
        code: 'OWNERSHIP_DENIED'
      });
      
    } catch (error) {
      logger.error('Ownership authorization error', { error });
      res.status(500).json({
        success: false,
        error: 'Authorization failed',
        code: 'AUTHZ_ERROR'
      });
    }
  };
};