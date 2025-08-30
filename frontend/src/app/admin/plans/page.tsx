'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  DollarSign,
  Users,
  TrendingUp,
  Settings,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  Crown,
  Zap
} from 'lucide-react';

// Types
interface Plan {
  id: string;
  name: string;
  type: 'free' | 'basic' | 'pro' | 'enterprise';
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  isActive: boolean;
  isPopular?: boolean;
  stripeProductId?: string;
  stripePriceMonthlyId?: string;
  stripePriceYearlyId?: string;
  createdAt: string;
  updatedAt: string;
  limits: {
    messagesPerDay: number;
    messagesPerMonth: number;
    aiResponsesPerDay: number;
    aiResponsesPerMonth: number;
    audioTranscriptionMinutesPerMonth: number;
    imageAnalysisPerMonth: number;
    botsAllowed: number;
    storageGB: number;
    customPrompts: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
  };
}

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: Plan;
  status: string;
  billingInterval: string;
  amount: number;
  currency: string;
  startDate: string;
  nextBillingDate?: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { addToast } = useToast();

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription/plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      addToast({ type: 'error', title: 'Erro ao carregar planos' });
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscription/subscriptions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      addToast({ type: 'error', title: 'Erro ao carregar assinaturas' });
    }
  };

  const syncWithStripe = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/payment/admin/sync-plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        addToast({ type: 'success', title: `Planos sincronizados: ${data.syncedPlans}/${data.totalPlans}` });
        await fetchPlans(); // Reload plans
      } else {
        throw new Error('Erro na sincronização');
      }
    } catch (error) {
      console.error('Error syncing with Stripe:', error);
      addToast({ type: 'error', title: 'Erro ao sincronizar com Stripe' });
    } finally {
      setSyncing(false);
    }
  };

  const togglePlanStatus = async (planId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/subscription/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        addToast({ type: 'success', title: `Plano ${isActive ? 'desativado' : 'ativado'} com sucesso` });
        await fetchPlans();
      } else {
        throw new Error('Erro ao atualizar plano');
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
      addToast({ type: 'error', title: 'Erro ao atualizar status do plano' });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPlans(), fetchSubscriptions()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'free': return <Zap className="h-4 w-4 text-gray-500" />;
      case 'basic': return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'pro': return <Crown className="h-4 w-4 text-purple-500" />;
      case 'enterprise': return <TrendingUp className="h-4 w-4 text-gold-500" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando planos...</p>
        </div>
      </div>
    );
  }

  // Statistics
  const stats = {
    totalPlans: plans.length,
    activePlans: plans.filter(p => p.isActive).length,
    totalSubscriptions: subscriptions.length,
    activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
    monthlyRevenue: subscriptions
      .filter(s => s.status === 'active' && s.billingInterval === 'monthly')
      .reduce((total, s) => total + s.amount, 0)
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Planos</h1>
        <p className="text-gray-600 mt-2">
          Configure e gerencie os planos de assinatura do sistema
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Planos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlans}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activePlans} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSubscriptions} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.monthlyRevenue, 'BRL')}
            </div>
            <p className="text-xs text-muted-foreground">
              Assinaturas mensais ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSubscriptions > 0 
                ? Math.round((stats.activeSubscriptions / stats.totalSubscriptions) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Conversão para assinantes ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <LoadingButton
              loading={syncing}
              onClick={syncWithStripe}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Stripe
            </LoadingButton>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Planos Disponíveis</CardTitle>
              <CardDescription>
                Gerencie os planos de assinatura e seus limites
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Preço Mensal</TableHead>
                  <TableHead>Preço Anual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stripe</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(plan.type)}
                        <div>
                          <div className="font-medium flex items-center">
                            {plan.name}
                            {plan.isPopular && (
                              <Badge variant="secondary" className="ml-2">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {plan.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={plan.type === 'free' ? 'secondary' : 'default'}
                        className="capitalize"
                      >
                        {plan.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(plan.price.monthly, plan.price.currency)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(plan.price.yearly, plan.price.currency)}
                      {plan.price.yearly > 0 && (
                        <div className="text-xs text-green-600">
                          Economia: {Math.round((1 - (plan.price.yearly / 12) / plan.price.monthly) * 100)}%
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePlanStatus(plan.id, plan.isActive)}
                        className={plan.isActive ? 'text-green-600' : 'text-red-600'}
                      >
                        {plan.isActive ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Inativo
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {plan.stripeProductId ? (
                        <Badge variant="outline" className="text-green-600">
                          Sincronizado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPlan(plan);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Assinaturas Ativas Recentes</CardTitle>
          <CardDescription>
            Últimas assinaturas criadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Próxima Cobrança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.slice(0, 10).map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">
                      {subscription.userId}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(subscription.plan.type)}
                        <span>{subscription.plan.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={subscription.status === 'active' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {subscription.billingInterval}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(subscription.amount, subscription.currency)}
                    </TableCell>
                    <TableCell>
                      {subscription.nextBillingDate 
                        ? new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR')
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}