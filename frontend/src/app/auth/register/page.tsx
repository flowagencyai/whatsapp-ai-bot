'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserPlus, Mail, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { username, email, password, confirmPassword } = formData;
    
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      addToast({
        type: 'error',
        title: 'Erro de validação',
        description: 'Por favor, preencha todos os campos.'
      });
      return false;
    }

    if (username.length < 3) {
      addToast({
        type: 'error',
        title: 'Erro de validação',
        description: 'O nome de usuário deve ter pelo menos 3 caracteres.'
      });
      return false;
    }

    if (!email.includes('@')) {
      addToast({
        type: 'error',
        title: 'Erro de validação',
        description: 'Por favor, insira um email válido.'
      });
      return false;
    }

    if (password.length < 6) {
      addToast({
        type: 'error',
        title: 'Erro de validação',
        description: 'A senha deve ter pelo menos 6 caracteres.'
      });
      return false;
    }

    if (password !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Erro de validação',
        description: 'As senhas não coincidem.'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer admin-token-here` // Temporário - implementar registro público
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: type === 'user' ? 'viewer' : 'operator', // Role baseado no tipo
          isActive: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Conta criada com sucesso!',
          description: 'Você pode fazer login agora.'
        });
        
        // Redirecionar para login
        router.push(`/auth/login?type=${type}`);
      } else {
        addToast({
          type: 'error',
          title: 'Erro no cadastro',
          description: data.error || 'Não foi possível criar a conta.'
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
              <div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full">
                <UserPlus className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-white">
              Criar Conta
            </CardTitle>
            <CardDescription className="text-center text-gray-300">
              {type === 'user' 
                ? 'Registre-se como usuário do sistema'
                : 'Crie sua conta para acessar o sistema'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Nome de Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Seu nome de usuário"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pr-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pr-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400 mb-3">
                Já possui uma conta?
              </p>
              <Link href={`/auth/login?type=${type}`}>
                <Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10">
                  Fazer Login
                </Button>
              </Link>
            </div>

            <div className="mt-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-300 mb-2">
                <strong>Funcionalidade em Desenvolvimento</strong>
              </p>
              <p className="text-xs text-amber-200">
                O registro de usuários está sendo implementado. Por enquanto, use as contas de teste disponíveis na página de login.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}