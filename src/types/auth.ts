// Authentication and Authorization Types

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  loginAttempts: number;
  lockedUntil?: string;
}

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'viewer' | 'operator';

export type Permission = 
  // System permissions
  | 'system:read' | 'system:write' | 'system:restart' | 'system:backup'
  // Config permissions
  | 'config:read' | 'config:write' | 'config:reset' | 'config:backup'
  // User management permissions
  | 'users:read' | 'users:write' | 'users:delete' | 'users:bulk_actions'
  // Bot management permissions
  | 'bot:read' | 'bot:control' | 'bot:pause' | 'bot:resume'
  // Conversation permissions
  | 'conversations:read' | 'conversations:write' | 'conversations:delete'
  // Admin user management
  | 'admin_users:read' | 'admin_users:write' | 'admin_users:delete'
  // Logs and monitoring
  | 'logs:read' | 'logs:export' | 'logs:clear'
  // Statistics and analytics
  | 'stats:read' | 'stats:export'
  // Memory management
  | 'memory:read' | 'memory:write' | 'memory:clear';

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  permissions?: Permission[];
}

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    // All permissions
    'system:read', 'system:write', 'system:restart', 'system:backup',
    'config:read', 'config:write', 'config:reset', 'config:backup',
    'users:read', 'users:write', 'users:delete', 'users:bulk_actions',
    'bot:read', 'bot:control', 'bot:pause', 'bot:resume',
    'conversations:read', 'conversations:write', 'conversations:delete',
    'admin_users:read', 'admin_users:write', 'admin_users:delete',
    'logs:read', 'logs:export', 'logs:clear',
    'stats:read', 'stats:export',
    'memory:read', 'memory:write', 'memory:clear'
  ],
  
  admin: [
    'system:read', 'system:backup',
    'config:read', 'config:write', 'config:backup',
    'users:read', 'users:write', 'users:bulk_actions',
    'bot:read', 'bot:control', 'bot:pause', 'bot:resume',
    'conversations:read', 'conversations:write',
    'admin_users:read', 'admin_users:write',
    'logs:read', 'logs:export',
    'stats:read', 'stats:export',
    'memory:read', 'memory:write', 'memory:clear'
  ],
  
  moderator: [
    'system:read',
    'config:read',
    'users:read', 'users:write',
    'bot:read', 'bot:pause', 'bot:resume',
    'conversations:read', 'conversations:write',
    'admin_users:read',
    'logs:read',
    'stats:read',
    'memory:read', 'memory:write'
  ],
  
  operator: [
    'system:read',
    'config:read',
    'users:read',
    'bot:read', 'bot:pause', 'bot:resume',
    'conversations:read',
    'logs:read',
    'stats:read',
    'memory:read'
  ],
  
  viewer: [
    'system:read',
    'config:read',
    'users:read',
    'bot:read',
    'conversations:read',
    'logs:read',
    'stats:read',
    'memory:read'
  ]
};

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface SecuritySettings {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  tokenExpirationTime: number; // in minutes
  refreshTokenExpirationTime: number; // in days
  requireTwoFactor: boolean;
  sessionTimeout: number; // in minutes
}