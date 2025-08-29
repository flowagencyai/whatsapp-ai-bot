'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, User, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UserLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, loading, user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');

  useEffect(() => {
    // Se já está logado e não é admin, redirecionar para dashboard de usuário
    if (!loading && isAuthenticated && user && !user.role.includes('admin')) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      addToast({
        type: 'error',
        title: 'Erro de validação',
        description: 'Por favor, preencha todos os campos.'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Para login de usuário, usamos email em vez de username
      const result = await login({ 
        username: email.trim(), // Backend aceita email no campo username
        password 
      });
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Login realizado com sucesso',
          description: 'Bem-vindo ao sistema!'
        });
        
        // Redirecionar baseado no role
        if (user?.role.includes('admin')) {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
      } else {
        addToast({
          type: 'error',
          title: 'Erro no login',
          description: result.error || 'Credenciais inválidas.'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
          <span className="text-white">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10 p-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar à página inicial
            </Button>
          </Link>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-full">
                <User className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-white">
              {type === 'user' ? 'Login de Usuário' : 'Login'}
            </CardTitle>
            <CardDescription className="text-center text-gray-300">
              {type === 'user' 
                ? 'Acesse sua conta de usuário no sistema'
                : 'Faça login para acessar o sistema'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fazendo login...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400 mb-3">
                Não possui uma conta?
              </p>
              <Link href="/auth/register?type=user">
                <Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10">
                  Criar conta
                </Button>
              </Link>
            </div>

            <div className="mt-6 p-4 bg-white/10 rounded-lg border border-white/20">
              <p className="text-sm text-gray-300 mb-2">
                <strong>Conta de teste:</strong>
              </p>
              <div className="text-sm font-mono space-y-1 text-gray-400">
                <div>Email: <code className="bg-black/20 px-1 rounded">user@test.com</code></div>
                <div>Senha: <code className="bg-black/20 px-1 rounded">User12345</code></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Esta é uma conta de demonstração apenas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}