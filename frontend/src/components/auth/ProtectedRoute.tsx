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
  redirectTo = '/admin/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, hasPermission, hasRole, hasAnyPermission, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Still loading, don't redirect yet

    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole)) {
      router.replace('/admin/unauthorized');
      return;
    }

    // Check permission requirements
    if (requiredPermissions.length > 0) {
      const hasRequiredPermissions = requireAnyPermission
        ? hasAnyPermission(requiredPermissions)
        : requiredPermissions.every(permission => hasPermission(permission));

      if (!hasRequiredPermissions) {
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

  // Check permissions after loading
  if (requiredRole && !hasRole(requiredRole)) {
    return null; // Will redirect to unauthorized
  }

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
    <ProtectedRoute requiredPermissions={['config:read']}>
      {children}
    </ProtectedRoute>
  );
}

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="super_admin">
      {children}
    </ProtectedRoute>
  );
}

export function ConfigWriteRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredPermissions={['config:write']}>
      {children}
    </ProtectedRoute>
  );
}

export function UserManagementRoute({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredPermissions={['admin_users:read', 'admin_users:write']} requireAnyPermission>
      {children}
    </ProtectedRoute>
  );
}