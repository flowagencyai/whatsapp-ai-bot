'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut, AlertTriangle, Shield } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Security logging - Log unauthorized access attempts
  useEffect(() => {
    console.warn('[Security] Unauthorized access attempt detected:', {
      user: user?.username,
      role: user?.role,
      permissions: user?.permissions,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }, [user]);

  const handleGoBack = () => {
    router.back();
  };

  const handleLogout = async () => {
    console.log('[Security] User logout initiated from unauthorized page:', user?.username);
    await logout();
    router.replace('/admin/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Acesso Negado</CardTitle>
          <CardDescription>
            Você não possui permissões suficientes para acessar esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {user && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-800">Tentativa de Acesso Bloqueada</p>
                </div>
                <p className="text-xs text-red-700">
                  Esta ação foi registrada no sistema de segurança.
                </p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-gray-600" />
                  <p className="text-sm font-medium">Informações da Conta:</p>
                </div>
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Usuário:</span>
                    <span className="font-mono">{user.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cargo:</span>
                    <Badge variant={user.role === 'super_admin' ? 'destructive' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500 mb-2">Permissões atuais:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.permissions && user.permissions.length > 0 ? (
                        user.permissions.map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Nenhuma permissão
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              onClick={handleGoBack} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button 
              onClick={handleLogout} 
              variant="destructive" 
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair da conta
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}