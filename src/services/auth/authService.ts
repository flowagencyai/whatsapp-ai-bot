import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger.js';
import { emailService } from '../email/emailService.js';
import { 
  User, 
  UserRole, 
  Permission, 
  LoginRequest, 
  LoginResponse, 
  TokenPayload,
  CreateUserRequest,
  UpdateUserRequest,
  ROLE_PERMISSIONS,
  SecuritySettings
} from '../../types/auth.js';
import { BotError } from '../../types/index.js';

interface UserDB {
  users: User[];
  settings: SecuritySettings;
  version: string;
}

class AuthService {
  private static instance: AuthService;
  private usersDB: UserDB;
  private readonly dbPath: string;
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;

  private constructor() {
    this.dbPath = join(process.cwd(), 'config', 'users.json');
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
    this.usersDB = this.loadUsersDB();
    
    // Create default super admin if no users exist
    this.ensureDefaultAdmin();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadUsersDB(): UserDB {
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
      logger.error('Error loading users database, creating default', { error });
      return this.createDefaultDB();
    }
  }

  private createDefaultDB(): UserDB {
    return {
      users: [],
      settings: {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireNumbers: true,
        passwordRequireSymbols: false,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        tokenExpirationTime: 60,
        refreshTokenExpirationTime: 7,
        requireTwoFactor: false,
        sessionTimeout: 120
      },
      version: '1.0.0'
    };
  }

  private migrateDatabase(oldData: any): UserDB {
    logger.info('Migrating users database to new format');
    
    const newDB = this.createDefaultDB();
    
    if (oldData.users && Array.isArray(oldData.users)) {
      newDB.users = oldData.users.map((user: any) => ({
        ...user,
        loginAttempts: user.loginAttempts || 0,
        permissions: user.permissions || ROLE_PERMISSIONS[user.role] || []
      }));
    }
    
    this.saveUsersDB(newDB);
    return newDB;
  }

  private saveUsersDB(db?: UserDB): void {
    try {
      const dataToSave = db || this.usersDB;
      writeFileSync(this.dbPath, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      logger.error('Error saving users database', { error });
      throw new BotError('Failed to save users database', 'DATABASE_SAVE_ERROR');
    }
  }

  private async ensureDefaultAdmin(): Promise<void> {
    if (this.usersDB.users.length === 0) {
      logger.warn('Creating default users. Please change passwords immediately!');
      
      // Create default admin user
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123!';
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);
      
      const defaultAdmin: User = {
        id: 'admin-' + Date.now(),
        username: 'admin',
        email: 'admin@zecabot.local',
        role: 'super_admin',
        permissions: ROLE_PERMISSIONS.super_admin,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        loginAttempts: 0,
        password: hashedAdminPassword
      } as User & { password: string };

      // Create default regular user
      const userPassword = process.env.DEFAULT_USER_PASSWORD || 'user123';
      const hashedUserPassword = await bcrypt.hash(userPassword, 12);
      
      const defaultUser: User = {
        id: 'user-' + Date.now(),
        username: 'user@test.com',
        email: 'user@test.com',
        role: 'viewer',
        permissions: ROLE_PERMISSIONS.viewer,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        loginAttempts: 0,
        password: hashedUserPassword
      } as User & { password: string };

      this.usersDB.users.push(defaultAdmin, defaultUser);
      this.saveUsersDB();
      
      logger.info('Default users created', { 
        admin: 'admin',
        user: 'user@test.com'
      });
    }
  }

  // Authentication Methods
  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const { username, password } = credentials;
      
      // Find user by username or email
      const user = this.usersDB.users.find(u => 
        (u.username === username || u.email === username) && u.isActive
      );
      
      if (!user) {
        logger.warn('Login attempt with invalid username', { username });
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if user is locked
      if (this.isUserLocked(user)) {
        logger.warn('Login attempt on locked account', { username });
        return { success: false, error: 'Account temporarily locked. Try again later.' };
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, (user as any).password);
      
      if (!passwordMatch) {
        await this.handleFailedLogin(user.id);
        logger.warn('Failed login attempt', { username });
        return { success: false, error: 'Invalid credentials' };
      }

      // Reset login attempts on successful login
      await this.resetLoginAttempts(user.id);

      // Update last login
      await this.updateLastLogin(user.id);

      // Generate tokens
      const tokens = this.generateTokens(user);
      
      // Remove sensitive data
      const { password: _, ...userWithoutPassword } = user as any;
      
      logger.info('Successful login', { username, role: user.role });
      
      return {
        success: true,
        user: userWithoutPassword,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      };
      
    } catch (error) {
      logger.error('Error during login', { error });
      return { success: false, error: 'Login failed' };
    }
  }

  private isUserLocked(user: User): boolean {
    if (!user.lockedUntil) return false;
    
    const lockTime = new Date(user.lockedUntil).getTime();
    const now = Date.now();
    
    if (now > lockTime) {
      // Lock expired, remove it
      this.unlockUser(user.id);
      return false;
    }
    
    return true;
  }

  private async handleFailedLogin(userId: string): Promise<void> {
    const userIndex = this.usersDB.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const user = this.usersDB.users[userIndex];
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    user.updatedAt = new Date().toISOString();

    // Lock user if max attempts reached
    if (user.loginAttempts >= this.usersDB.settings.maxLoginAttempts) {
      const lockDuration = this.usersDB.settings.lockoutDuration * 60 * 1000; // Convert to ms
      user.lockedUntil = new Date(Date.now() + lockDuration).toISOString();
      
      logger.warn('User locked due to failed login attempts', { 
        userId, 
        attempts: user.loginAttempts 
      });
    }

    this.saveUsersDB();
  }

  private async resetLoginAttempts(userId: string): Promise<void> {
    const userIndex = this.usersDB.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    this.usersDB.users[userIndex].loginAttempts = 0;
    delete this.usersDB.users[userIndex].lockedUntil;
    this.usersDB.users[userIndex].updatedAt = new Date().toISOString();
    
    this.saveUsersDB();
  }

  private async updateLastLogin(userId: string): Promise<void> {
    const userIndex = this.usersDB.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    this.usersDB.users[userIndex].lastLogin = new Date().toISOString();
    this.usersDB.users[userIndex].updatedAt = new Date().toISOString();
    
    this.saveUsersDB();
  }

  private unlockUser(userId: string): void {
    const userIndex = this.usersDB.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    delete this.usersDB.users[userIndex].lockedUntil;
    this.usersDB.users[userIndex].loginAttempts = 0;
    this.usersDB.users[userIndex].updatedAt = new Date().toISOString();
    
    this.saveUsersDB();
  }

  // Token Management
  private generateTokens(user: User): { accessToken: string; refreshToken: string; expiresIn: number } {
    const payload: Omit<TokenPayload, 'iat' | 'exp' | 'aud' | 'iss'> = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    };

    const accessTokenExpiry = this.usersDB.settings.tokenExpirationTime * 60; // Convert to seconds
    const refreshTokenExpiry = this.usersDB.settings.refreshTokenExpirationTime * 24 * 60 * 60; // Convert to seconds

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: accessTokenExpiry,
      audience: 'zecabot-admin',
      issuer: 'zecabot-auth'
    });

    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' }, 
      this.jwtRefreshSecret, 
      { expiresIn: refreshTokenExpiry }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiry
    };
  }

  public verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      logger.debug('Token verification failed', { error: (error as Error).message });
      return null;
    }
  }

  public async refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      if (decoded.tokenType !== 'refresh') {
        return { success: false, error: 'Invalid refresh token' };
      }

      const user = this.usersDB.users.find(u => u.id === decoded.userId && u.isActive);
      
      if (!user) {
        return { success: false, error: 'User not found or inactive' };
      }

      const tokens = this.generateTokens(user);
      const { password: _, ...userWithoutPassword } = user as any;

      return {
        success: true,
        user: userWithoutPassword,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      };
      
    } catch (error) {
      logger.debug('Refresh token verification failed', { error: (error as Error).message });
      return { success: false, error: 'Invalid refresh token' };
    }
  }

  // User Management
  public async createUser(userData: CreateUserRequest): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Validate password
      const passwordValidation = this.validatePassword(userData.password);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.error };
      }

      // Check if username exists
      if (this.usersDB.users.some(u => u.username === userData.username)) {
        return { success: false, error: 'Username already exists' };
      }

      // Check if email exists
      if (this.usersDB.users.some(u => u.email === userData.email)) {
        return { success: false, error: 'Email already exists' };
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const newUser: User & { password: string } = {
        id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        username: userData.username,
        email: userData.email,
        role: userData.role,
        permissions: ROLE_PERMISSIONS[userData.role],
        isActive: userData.isActive ?? true,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        loginAttempts: 0,
        password: hashedPassword
      };

      this.usersDB.users.push(newUser);
      this.saveUsersDB();

      const { password: _, ...userWithoutPassword } = newUser;
      
      // Enviar email de verificação
      if (emailService.isConfigured()) {
        await emailService.sendVerificationEmail(userData.email, newUser.id, userData.username);
        logger.info('Verification email sent', { email: userData.email });
      }
      
      logger.info('New user created', { username: userData.username, role: userData.role });
      
      return { success: true, user: userWithoutPassword };
      
    } catch (error) {
      logger.error('Error creating user', { error });
      return { success: false, error: 'Failed to create user' };
    }
  }

  private validatePassword(password: string): { valid: boolean; error?: string } {
    const settings = this.usersDB.settings;
    
    if (password.length < settings.passwordMinLength) {
      return { valid: false, error: `Password must be at least ${settings.passwordMinLength} characters long` };
    }

    if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (settings.passwordRequireNumbers && !/[0-9]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }

    if (settings.passwordRequireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one symbol' };
    }

    return { valid: true };
  }

  // Email verification
  public async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const verificationData = emailService.verifyEmailToken(token);
      
      if (!verificationData) {
        return { success: false, message: 'Token inválido ou expirado' };
      }

      const userIndex = this.usersDB.users.findIndex(u => u.id === verificationData.userId);
      
      if (userIndex === -1) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      this.usersDB.users[userIndex].emailVerified = true;
      this.usersDB.users[userIndex].emailVerifiedAt = new Date().toISOString();
      this.usersDB.users[userIndex].updatedAt = new Date().toISOString();
      
      this.saveUsersDB();

      // Enviar email de boas-vindas
      if (emailService.isConfigured()) {
        await emailService.sendWelcomeEmail(
          this.usersDB.users[userIndex].email,
          this.usersDB.users[userIndex].username
        );
      }

      logger.info('Email verified successfully', { 
        userId: verificationData.userId,
        email: verificationData.email 
      });

      return { success: true, message: 'Email verificado com sucesso!' };
    } catch (error) {
      logger.error('Error verifying email', { error });
      return { success: false, message: 'Erro ao verificar email' };
    }
  }

  public async resendVerificationEmail(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = this.usersDB.users.find(u => u.id === userId);
      
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      if (user.emailVerified) {
        return { success: false, message: 'Email já foi verificado' };
      }

      if (emailService.isConfigured()) {
        await emailService.sendVerificationEmail(user.email, user.id, user.username);
        logger.info('Verification email resent', { email: user.email });
        return { success: true, message: 'Email de verificação reenviado' };
      }

      return { success: false, message: 'Serviço de email não configurado' };
    } catch (error) {
      logger.error('Error resending verification email', { error });
      return { success: false, message: 'Erro ao reenviar email de verificação' };
    }
  }

  // Permission checking
  public hasPermission(user: User, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  public hasAnyPermission(user: User, permissions: Permission[]): boolean {
    return permissions.some(permission => user.permissions.includes(permission));
  }

  public hasAllPermissions(user: User, permissions: Permission[]): boolean {
    return permissions.every(permission => user.permissions.includes(permission));
  }

  // Getters
  public getAllUsers(): User[] {
    return this.usersDB.users.map(user => {
      const { password: _, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    });
  }

  public getUserById(id: string): User | null {
    const user = this.usersDB.users.find(u => u.id === id);
    if (!user) return null;
    
    const { password: _, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  public getSecuritySettings(): SecuritySettings {
    return { ...this.usersDB.settings };
  }
}

export const authService = AuthService.getInstance();
export default authService;