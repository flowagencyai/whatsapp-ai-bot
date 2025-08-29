interface User {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'operator' | 'viewer';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
  error?: string;
  code?: string;
  timestamp: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

class AuthService {
  private static instance: AuthService;
  private baseURL: string;
  private tokenKey = 'whatsapp-bot-token';
  private refreshTokenKey = 'whatsapp-bot-refresh-token';
  private userKey = 'whatsapp-bot-user';

  private constructor() {
    this.baseURL = 'http://localhost:3000/api/auth';
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        // Store tokens and user data
        localStorage.setItem(this.tokenKey, data.data.accessToken);
        localStorage.setItem(this.refreshTokenKey, data.data.refreshToken);
        localStorage.setItem(this.userKey, JSON.stringify(data.data.user));
        
        return { success: true, user: data.data.user };
      } else {
        return { success: false, error: data.error || 'Login falhou' };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  }

  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${this.baseURL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.userKey);
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(this.refreshTokenKey);
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        localStorage.setItem(this.tokenKey, data.data.accessToken);
        localStorage.setItem(this.refreshTokenKey, data.data.refreshToken);
        localStorage.setItem(this.userKey, JSON.stringify(data.data.user));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      return false;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): User | null {
    const userData = localStorage.getItem(this.userKey);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user?.permissions.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  hasAnyPermission(permissions: string[]): boolean {
    const user = this.getUser();
    if (!user) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    let token = this.getToken();
    
    if (!token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        token = this.getToken();
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Refresh failed, redirect to login
        this.logout();
        window.location.href = '/admin/login';
        throw new Error('Sessão expirada');
      }
    }

    return response;
  }
}

export const authService = AuthService.getInstance();
export type { User, LoginCredentials };