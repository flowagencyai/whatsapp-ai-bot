'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/confirm-dialog';

export function useSmartNavigation() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { confirm } = useConfirm();

  const getDashboardRoute = () => {
    // Retorna a rota do dashboard apropriada baseada no role
    if (user?.role === 'viewer') {
      return '/dashboard'; // Dashboard simples para usuários comuns
    } else {
      return '/admin'; // Dashboard admin para outros roles
    }
  };

  const goToDashboard = () => {
    router.push(getDashboardRoute());
  };

  const goToHome = async () => {
    const confirmed = await confirm({
      title: 'Sair do Sistema',
      description: 'Tem certeza que deseja sair? Você será redirecionado para a página inicial e precisará fazer login novamente.',
      confirmText: 'Sim, sair',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      await logout();
      router.push('/');
    }
  };

  const smartBack = () => {
    // Implementação inteligente do botão voltar
    // Por enquanto volta para o dashboard, mas pode ser expandida
    goToDashboard();
  };

  return {
    user,
    getDashboardRoute,
    goToDashboard,
    goToHome,
    smartBack,
    logout: async () => {
      const confirmed = await confirm({
        title: 'Fazer Logout',
        description: 'Tem certeza que deseja sair da sua conta?',
        confirmText: 'Sim, sair',
        cancelText: 'Cancelar'
      });

      if (confirmed) {
        await logout();
        router.push('/');
      }
    }
  };
}