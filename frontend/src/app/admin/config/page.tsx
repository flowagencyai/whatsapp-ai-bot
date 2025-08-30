'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfigWriteRoute } from '@/components/auth/ProtectedRoute';
import { api } from '@/lib/api';
import type { AdminConfig } from '@/types';
import { 
  Settings, 
  Brain,
  MessageSquare,
  Zap,
  Save,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Shield,
  CreditCard,
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  Crown
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

export default function AdminConfig() {
  // Render with security protection wrapper
  return (
    <ConfigWriteRoute>
      <AdminConfigContent />
    </ConfigWriteRoute>
  );
}

function AdminConfigContent() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'bot' | 'features' | 'plans'>('ai');
  const [hasChanges, setHasChanges] = useState(false);
  const [tempConfig, setTempConfig] = useState<AdminConfig | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<string | null>(null);
  
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    loadConfig();
    if (activeTab === 'plans') {
      fetchPlans();
      fetchSubscriptions();
    }
  }, [activeTab]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminConfig();
      if (response.success && response.data) {
        setConfig(response.data);
        setTempConfig(response.data);
        setError(null);
        setHasChanges(false);
      } else {
        setError(response.error || 'Failed to load configuration');
      }
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

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

  const createPlan = () => {
    setEditingPlan({
      id: '',
      name: '',
      type: 'basic',
      description: '',
      price: {
        monthly: 0,
        yearly: 0,
        currency: 'BRL'
      },
      isActive: true,
      isPopular: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      limits: {
        messagesPerDay: 100,
        messagesPerMonth: 3000,
        aiResponsesPerDay: 50,
        aiResponsesPerMonth: 1500,
        audioTranscriptionMinutesPerMonth: 60,
        imageAnalysisPerMonth: 100,
        botsAllowed: 1,
        storageGB: 5,
        customPrompts: false,
        prioritySupport: false,
        apiAccess: false
      }
    });
    setIsCreateDialogOpen(true);
  };

  const savePlan = async () => {
    if (!editingPlan) return;

    setSavingPlan(true);
    try {
      const isEditing = editingPlan.id && editingPlan.id !== '';
      const url = isEditing 
        ? `/api/subscription/plans/${editingPlan.id}`
        : '/api/subscription/plans';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editingPlan)
      });

      if (response.ok) {
        addToast({ 
          type: 'success', 
          title: `Plano ${isEditing ? 'atualizado' : 'criado'} com sucesso` 
        });
        await fetchPlans();
        setIsEditDialogOpen(false);
        setIsCreateDialogOpen(false);
        setEditingPlan(null);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar plano');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      addToast({ 
        type: 'error', 
        title: 'Erro ao salvar plano',
        description: (error as Error).message
      });
    } finally {
      setSavingPlan(false);
    }
  };

  const deletePlan = async (planId: string) => {
    const confirmed = await confirm({
      title: 'Deletar Plano',
      description: 'Tem certeza que deseja deletar este plano? Esta ação não pode ser desfeita e pode afetar assinaturas existentes.',
      confirmText: 'Sim, deletar',
      cancelText: 'Cancelar',
      variant: 'destructive'
    });

    if (confirmed) {
      setDeletingPlan(planId);
      try {
        const response = await fetch(`/api/subscription/plans/${planId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          addToast({ type: 'success', title: 'Plano deletado com sucesso' });
          await fetchPlans();
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao deletar plano');
        }
      } catch (error) {
        console.error('Error deleting plan:', error);
        addToast({ 
          type: 'error', 
          title: 'Erro ao deletar plano',
          description: (error as Error).message
        });
      } finally {
        setDeletingPlan(null);
      }
    }
  };

  const handleSave = async () => {
    if (!tempConfig || !config) return;
    
    try {
      setSaving(true);
      
      // Save each section that has changes
      const sections: (keyof AdminConfig)[] = ['ai', 'bot', 'features'];
      let updatedSections = 0;
      
      for (const section of sections) {
        if (JSON.stringify(tempConfig[section]) !== JSON.stringify(config[section])) {
          const response = await api.updateAdminConfigSection(
            section, 
            tempConfig[section], 
            'admin-interface'
          );
          
          if (!response.success) {
            throw new Error(response.error || `Failed to update ${section} section`);
          }
          updatedSections++;
        }
      }
      
      setConfig(tempConfig);
      setHasChanges(false);
      
      addToast({
        type: 'success',
        title: 'Configuração salva com sucesso!',
        description: `${updatedSections} seção${updatedSections > 1 ? 'ões' : ''} atualizada${updatedSections > 1 ? 's' : ''}.`,
        duration: 4000
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erro ao salvar configuração',
        description: String(err),
        duration: 6000
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: 'Resetar Configuração',
      description: 'Tem certeza que deseja resetar toda a configuração para os valores padrão? Esta ação não pode ser desfeita.',
      confirmText: 'Sim, resetar',
      cancelText: 'Cancelar',
      variant: 'destructive'
    });

    if (confirmed) {
      try {
        setResetting(true);
        const response = await api.resetAdminConfig('admin-interface');
        
        if (response.success && response.data) {
          setConfig(response.data);
          setTempConfig(response.data);
          setHasChanges(false);
          
          addToast({
            type: 'success',
            title: 'Configuração resetada!',
            description: 'Todas as configurações foram restauradas para os valores padrão.',
            duration: 4000
          });
        } else {
          throw new Error(response.error || 'Failed to reset configuration');
        }
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Erro ao resetar configuração',
          description: String(err),
          duration: 6000
        });
      } finally {
        setResetting(false);
      }
    }
  };

  const handleBackup = async () => {
    try {
      setBacking(true);
      const response = await api.createAdminConfigBackup();
      if (response.success && response.data) {
        addToast({
          type: 'success',
          title: 'Backup criado com sucesso!',
          description: `Backup salvo em: ${response.data.backupPath}`,
          duration: 6000
        });
      } else {
        throw new Error(response.error || 'Failed to create backup');
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Erro ao criar backup',
        description: String(err),
        duration: 6000
      });
    } finally {
      setBacking(false);
    }
  };

  const updateTempConfig = (section: keyof AdminConfig, field: string, value: any) => {
    if (!tempConfig) return;
    
    const newConfig = { ...tempConfig };
    (newConfig[section] as any)[field] = value;
    setTempConfig(newConfig);
    setHasChanges(true);
  };

  const updateNestedTempConfig = (section: keyof AdminConfig, parentField: string, field: string, value: any) => {
    if (!tempConfig) return;
    
    const newConfig = { ...tempConfig };
    ((newConfig[section] as any)[parentField] as any)[field] = value;
    setTempConfig(newConfig);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error || !config || !tempConfig) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
        <Card className="p-6">
          <button 
            onClick={loadConfig}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'ai', label: 'AI Settings', icon: Brain },
    { id: 'bot', label: 'Bot Settings', icon: MessageSquare },
    { id: 'features', label: 'Features', icon: Zap },
    { id: 'plans', label: 'Planos & Assinaturas', icon: CreditCard }
  ] as const;

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Shield className="w-8 h-8 text-red-600 mr-3" />
            Configuração do Sistema
          </h1>
          <p className="text-gray-600">Gerencie configurações e comportamento do bot</p>
          <div className="mt-2">
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <Shield className="w-3 h-3 mr-1" />
              Área Restrita - Requer permissões especiais
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <LoadingButton
            onClick={handleBackup}
            loading={backing}
            loadingText="Criando..."
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Backup
          </LoadingButton>
          
          <LoadingButton
            onClick={handleReset}
            loading={resetting}
            loadingText="Resetando..."
            disabled={saving || backing}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrões
          </LoadingButton>
          
          {hasChanges && (
            <LoadingButton
              onClick={handleSave}
              loading={saving}
              loadingText="Salvando..."
              disabled={backing || resetting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </LoadingButton>
          )}
        </div>
      </div>

      {hasChanges && (
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">
                  Alterações Não Salvas
                </h3>
                <p className="text-sm text-orange-700">
                  Você tem modificações pendentes que precisam ser salvas.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <LoadingButton
                onClick={handleSave}
                loading={saving}
                loadingText="Salvando..."
                disabled={backing || resetting}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Salvar Agora
              </LoadingButton>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs Sidebar */}
        <Card className="p-4 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-left
                    ${isActive 
                      ? 'bg-blue-100 text-blue-900 border-blue-300' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <tab.icon 
                    className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} 
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Configuration Content */}
        <div className="lg:col-span-3">
          {activeTab === 'ai' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Brain className="h-6 w-6 text-blue-600 mr-2" />
                AI Configuration
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    value={tempConfig.ai.systemPrompt}
                    onChange={(e) => updateTempConfig('ai', 'systemPrompt', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter the system prompt for the AI..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature ({tempConfig.ai.temperature})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={tempConfig.ai.temperature}
                      onChange={(e) => updateTempConfig('ai', 'temperature', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Conservative</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="8000"
                      value={tempConfig.ai.maxTokens}
                      onChange={(e) => updateTempConfig('ai', 'maxTokens', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Memory Size (messages)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={tempConfig.ai.memorySize}
                      onChange={(e) => updateTempConfig('ai', 'memorySize', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={tempConfig.ai.model}
                      onChange={(e) => updateTempConfig('ai', 'model', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'bot' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <MessageSquare className="h-6 w-6 text-green-600 mr-2" />
                Bot Configuration
              </h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bot Name
                    </label>
                    <input
                      type="text"
                      value={tempConfig.bot.name}
                      onChange={(e) => updateTempConfig('bot', 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message
                  </label>
                  <textarea
                    value={tempConfig.bot.welcomeMessage}
                    onChange={(e) => updateTempConfig('bot', 'welcomeMessage', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter the welcome message..."
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Commands</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(tempConfig.bot.commands).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                          {key} Command
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateNestedTempConfig('bot', 'commands', key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'features' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Zap className="h-6 w-6 text-purple-600 mr-2" />
                Feature Toggles
              </h2>
              
              <div className="space-y-4">
                {Object.entries(tempConfig.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {getFeatureDescription(key)}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(e) => updateTempConfig('features', key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'plans' && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Planos</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{plans.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {plans.filter(p => p.isActive).length} ativos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assinaturas</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{subscriptions.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {subscriptions.filter(s => s.status === 'active').length} ativas
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
                      {formatCurrency(
                        subscriptions
                          .filter(s => s.status === 'active' && s.billingInterval === 'monthly')
                          .reduce((total, s) => total + s.amount, 0),
                        'BRL'
                      )}
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
                      {subscriptions.length > 0 
                        ? Math.round((subscriptions.filter(s => s.status === 'active').length / subscriptions.length) * 100)
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
                    <Button onClick={createPlan}>
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
                                <LoadingButton
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  loading={deletingPlan === plan.id}
                                  onClick={() => deletePlan(plan.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </LoadingButton>
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
          )}
        </div>
      </div>

      {/* Plan Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingPlan(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? 'Criar Novo Plano' : 'Editar Plano'}
            </DialogTitle>
            <DialogDescription>
              {isCreateDialogOpen 
                ? 'Configure os detalhes do novo plano de assinatura'
                : 'Modifique os detalhes do plano de assinatura'
              }
            </DialogDescription>
          </DialogHeader>
          
          {editingPlan && (
            <div className="grid gap-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Nome do Plano</Label>
                  <Input
                    id="plan-name"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="Ex: Plano Básico"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-type">Tipo do Plano</Label>
                  <Select 
                    value={editingPlan.type} 
                    onValueChange={(value: any) => setEditingPlan({ ...editingPlan, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuito</SelectItem>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="pro">Profissional</SelectItem>
                      <SelectItem value="enterprise">Empresarial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-description">Descrição</Label>
                <Textarea
                  id="plan-description"
                  value={editingPlan.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  placeholder="Descreva os benefícios deste plano"
                  rows={3}
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price-monthly">Preço Mensal (R$)</Label>
                  <Input
                    id="price-monthly"
                    type="number"
                    step="0.01"
                    value={editingPlan.price.monthly}
                    onChange={(e) => setEditingPlan({ 
                      ...editingPlan, 
                      price: { ...editingPlan.price, monthly: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price-yearly">Preço Anual (R$)</Label>
                  <Input
                    id="price-yearly"
                    type="number"
                    step="0.01"
                    value={editingPlan.price.yearly}
                    onChange={(e) => setEditingPlan({ 
                      ...editingPlan, 
                      price: { ...editingPlan.price, yearly: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price-currency">Moeda</Label>
                  <Select 
                    value={editingPlan.price.currency} 
                    onValueChange={(value: string) => setEditingPlan({ 
                      ...editingPlan, 
                      price: { ...editingPlan.price, currency: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (BRL)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Plan Status */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingPlan.isActive}
                    onCheckedChange={(checked: boolean) => setEditingPlan({ ...editingPlan, isActive: checked })}
                  />
                  <Label htmlFor="plan-active">Plano Ativo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingPlan.isPopular || false}
                    onCheckedChange={(checked: boolean) => setEditingPlan({ ...editingPlan, isPopular: checked })}
                  />
                  <Label htmlFor="plan-popular">Plano Popular</Label>
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Limites do Plano</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="messages-per-day">Mensagens por Dia</Label>
                    <Input
                      id="messages-per-day"
                      type="number"
                      value={editingPlan.limits.messagesPerDay}
                      onChange={(e) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, messagesPerDay: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="messages-per-month">Mensagens por Mês</Label>
                    <Input
                      id="messages-per-month"
                      type="number"
                      value={editingPlan.limits.messagesPerMonth}
                      onChange={(e) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, messagesPerMonth: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-responses-day">Respostas IA por Dia</Label>
                    <Input
                      id="ai-responses-day"
                      type="number"
                      value={editingPlan.limits.aiResponsesPerDay}
                      onChange={(e) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, aiResponsesPerDay: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-responses-month">Respostas IA por Mês</Label>
                    <Input
                      id="ai-responses-month"
                      type="number"
                      value={editingPlan.limits.aiResponsesPerMonth}
                      onChange={(e) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, aiResponsesPerMonth: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="audio-minutes">Minutos de Áudio/Mês</Label>
                    <Input
                      id="audio-minutes"
                      type="number"
                      value={editingPlan.limits.audioTranscriptionMinutesPerMonth}
                      onChange={(e) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, audioTranscriptionMinutesPerMonth: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image-analysis">Análise de Imagem/Mês</Label>
                    <Input
                      id="image-analysis"
                      type="number"
                      value={editingPlan.limits.imageAnalysisPerMonth}
                      onChange={(e) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, imageAnalysisPerMonth: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bots-allowed">Bots Permitidos</Label>
                    <Input
                      id="bots-allowed"
                      type="number"
                      value={editingPlan.limits.botsAllowed}
                      onChange={(e) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, botsAllowed: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storage-gb">Armazenamento (GB)</Label>
                    <Input
                      id="storage-gb"
                      type="number"
                      value={editingPlan.limits.storageGB}
                      onChange={(e) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, storageGB: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={editingPlan.limits.customPrompts}
                      onCheckedChange={(checked: boolean) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, customPrompts: checked }
                      })}
                    />
                    <Label htmlFor="custom-prompts">Prompts Customizados</Label>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={editingPlan.limits.prioritySupport}
                      onCheckedChange={(checked: boolean) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, prioritySupport: checked }
                      })}
                    />
                    <Label htmlFor="priority-support">Suporte Prioritário</Label>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={editingPlan.limits.apiAccess}
                      onCheckedChange={(checked: boolean) => setEditingPlan({ 
                        ...editingPlan, 
                        limits: { ...editingPlan.limits, apiAccess: checked }
                      })}
                    />
                    <Label htmlFor="api-access">Acesso API</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setEditingPlan(null);
              }}
            >
              Cancelar
            </Button>
            <LoadingButton
              loading={savingPlan}
              onClick={savePlan}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreateDialogOpen ? 'Criar Plano' : 'Salvar Alterações'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configuration Info */}
      <Card className="p-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Version:</span> {config.version}
          </div>
          <div>
            <span className="font-medium">Last Updated:</span> {new Date(config.updatedAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Updated By:</span> {config.updatedBy}
          </div>
        </div>
      </Card>
    </div>
  );
}

function getFeatureDescription(key: string): string {
  const descriptions: { [key: string]: string } = {
    audioTranscription: 'Enable voice message transcription using Groq Whisper',
    imageAnalysis: 'Enable image analysis using GPT-4o-mini Vision',
    pdfGeneration: 'Enable PDF document generation and sending',
    contextMemory: 'Enable conversation context memory',
    rateLimiting: 'Enable rate limiting for user messages'
  };
  return descriptions[key] || 'Feature toggle';
}