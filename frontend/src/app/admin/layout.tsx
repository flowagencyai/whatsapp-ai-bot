'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Users, BarChart3, Shield, Database, Wrench, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { SmartBackButton } from '@/components/ui/smart-back-button';

const adminNavItems = [
  { href: '/admin/dashboard', icon: BarChart3, label: 'Visão Geral', description: 'Estatísticas do sistema' },
  { href: '/admin/users', icon: Users, label: 'Usuários', description: 'Gerenciar contas de usuário' },
  { href: '/admin/config', icon: Settings, label: 'Configurações', description: 'Configurações do bot' },
  { href: '/admin/system', icon: Shield, label: 'Sistema', description: 'Informações técnicas' },
  { href: '/admin/memory', icon: Database, label: 'Memória & Cache', description: 'Gerenciar dados em cache' },
  { href: '/admin/tools', icon: Wrench, label: 'Ferramentas', description: 'Utilitários administrativos' },
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-8">
                <div className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-xs text-gray-500">Painel Administrativo</p>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="space-y-2">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={`flex items-start space-x-3 px-3 py-3 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-red-50 text-red-700 border-l-4 border-red-500' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}>
                        <Icon className={`w-5 h-5 mt-0.5 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${isActive ? 'text-red-900' : 'text-gray-900'}`}>
                            {item.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Info & Logout */}
            <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-gray-200 bg-white">
              {user && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.username}
                      </p>
                      <div className="text-xs text-gray-500">
                        <Badge variant="destructive" className="text-xs">{user.role}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sair
                    </Button>
                    <SmartBackButton 
                      variant="ghost"
                      size="sm"
                      title="Voltar"
                      className="text-gray-500 hover:text-gray-700"
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}