'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Users, BarChart3, Shield, Database, Wrench, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const adminNavItems = [
  { href: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/config', icon: Settings, label: 'Configuration' },
  { href: '/admin/system', icon: Shield, label: 'System' },
  { href: '/admin/memory', icon: Database, label: 'Memory' },
  { href: '/admin/tools', icon: Wrench, label: 'Tools' },
];

const PUBLIC_ADMIN_ROUTES = ['/admin/login', '/admin/unauthorized'];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ADMIN_ROUTES.includes(pathname);

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  // Public routes don't need authentication
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Protected admin routes
  return (
    <ProtectedRoute requiredPermissions={['config:read']}>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Shield className="h-8 w-8 text-red-600" />
                  <span className="ml-2 text-xl font-bold text-gray-900">Admin Panel</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {user && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      Olá, <span className="font-medium">{user.username}</span>
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                      {user.role}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sair
                    </Button>
                  </div>
                )}
                <Link 
                  href="/" 
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  ← Voltar ao Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card className="p-4">
              <nav className="space-y-1">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        ${isActive 
                          ? 'bg-red-100 text-red-900 border-red-300' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon 
                        className={`mr-3 h-5 w-5 ${isActive ? 'text-red-500' : 'text-gray-400 group-hover:text-gray-500'}`} 
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}