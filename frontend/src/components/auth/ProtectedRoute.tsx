'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredRole?: string;
  requireAnyPermission?: boolean; // true = any permission, false = all permissions
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRole,
  requireAnyPermission = false,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, hasPermission, hasRole, hasAnyPermission, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Still loading, don't redirect yet

    // Security check 1: User must be authenticated
    if (!isAuthenticated) {
      console.warn('[Security] Unauthenticated access attempt blocked');
      router.replace(redirectTo);
      return;
    }

    // Security check 2: User account must be active
    if (user && !user.isActive) {
      console.warn('[Security] Inactive user access attempt blocked:', user.username);
      router.replace('/admin/unauthorized');
      return;
    }

    // Security check 3: Role requirement validation
    if (requiredRole && !hasRole(requiredRole)) {
      console.warn('[Security] Insufficient role access attempt blocked:', {
        required: requiredRole,
        current: user?.role,
        user: user?.username
      });
      router.replace('/admin/unauthorized');
      return;
    }

    // Security check 4: Permission requirements validation
    if (requiredPermissions.length > 0) {
      const hasRequiredPermissions = requireAnyPermission
        ? hasAnyPermission(requiredPermissions)
        : requiredPermissions.every(permission => hasPermission(permission));

      if (!hasRequiredPermissions) {
        console.warn('[Security] Insufficient permissions access attempt blocked:', {
          required: requiredPermissions,
          requireAny: requireAnyPermission,
          userPermissions: user?.permissions,
          user: user?.username
        });
        router.replace('/admin/unauthorized');
        return;
      }
    }
  }, [
    isAuthenticated,
    loading,
    requiredPermissions,
    requiredRole,
    requireAnyPermission,
    hasPermission,
    hasRole,
    hasAnyPermission,
    user,
    router,
    redirectTo
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  // Final security checks before rendering
  // Additional check for user account status
  if (user && !user.isActive) {
    return null; // Will redirect to unauthorized
  }

  // Role validation check
  if (requiredRole && !hasRole(requiredRole)) {
    return null; // Will redirect to unauthorized
  }

  // Permission validation check
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAnyPermission
      ? hasAnyPermission(requiredPermissions)
      : requiredPermissions.every(permission => hasPermission(permission));

    if (!hasRequiredPermissions) {
      return null; // Will redirect to unauthorized
    }
  }

  return <>{children}</>;
}

// Convenience wrapper components for common permission checks
export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredPermissions={['admin_panel:access']} redirectTo="/admin/login">
      {children}
    </ProtectedRoute>
  );
}

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="super_admin" redirectTo="/admin/login">
      {children}
    </ProtectedRoute>
  );
}

export function ConfigWriteRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredPermissions={['config:write']} redirectTo="/admin/login">
      {children}
    </ProtectedRoute>
  );
}

export function UserManagementRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredPermissions={['admin_users:read', 'admin_users:write']} requireAnyPermission redirectTo="/admin/login">
      {children}
    </ProtectedRoute>
  );
}