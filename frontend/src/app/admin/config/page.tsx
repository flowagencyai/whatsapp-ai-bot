'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
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
  Shield
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'ai' | 'bot' | 'features'>('ai');
  const [hasChanges, setHasChanges] = useState(false);
  const [tempConfig, setTempConfig] = useState<AdminConfig | null>(null);
  
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    loadConfig();
  }, []);

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
    { id: 'features', label: 'Features', icon: Zap }
  ] as const;

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
        </div>
      </div>

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