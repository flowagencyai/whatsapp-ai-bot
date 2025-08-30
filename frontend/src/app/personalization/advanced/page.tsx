'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Save, 
  Brain, 
  Lightbulb,
  Archive,
  Clock,
  Info,
  AlertTriangle
} from 'lucide-react';

interface MemorySettings {
  immediateMemorySize: number;
  workingMemorySize: number;
  longTermMemorySize: number;
  summarizationThreshold: number;
}

interface AdvancedPersonalization {
  useIntelligentMemory: boolean;
  memorySettings: MemorySettings;
}

export default function AdvancedPersonalizationPage() {
  const { user, getToken } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AdvancedPersonalization>({
    useIntelligentMemory: false,
    memorySettings: {
      immediateMemorySize: 5,
      workingMemorySize: 10,
      longTermMemorySize: 3,
      summarizationThreshold: 15
    }
  });

  useEffect(() => {
    loadAdvancedSettings();
  }, []);

  const loadAdvancedSettings = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch('/api/user/personalization', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({
          useIntelligentMemory: data.data.ai.useIntelligentMemory || false,
          memorySettings: {
            immediateMemorySize: data.data.ai.memorySettings?.immediateMemorySize || 5,
            workingMemorySize: data.data.ai.memorySettings?.workingMemorySize || 10,
            longTermMemorySize: data.data.ai.memorySettings?.longTermMemorySize || 3,
            summarizationThreshold: data.data.ai.memorySettings?.summarizationThreshold || 15
          }
        });
      }
    } catch (error) {
      console.error('Error loading advanced settings:', error);
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as configurações avançadas.',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAdvancedSettings = async () => {
    try {
      setSaving(true);
      const token = await getToken();

      const updateData = {
        ai: {
          useIntelligentMemory: config.useIntelligentMemory,
          memorySettings: config.memorySettings
        }
      };

      const response = await fetch('/api/user/personalization', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Configurações salvas!',
          description: 'Suas configurações avançadas foram atualizadas.',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving advanced settings:', error);
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando configurações avançadas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Memória Inteligente</h1>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            BETA
          </Badge>
        </div>
        <p className="text-muted-foreground mt-2">
          Configure como o ZecaBot processa e lembra das suas conversas usando IA avançada
        </p>
      </div>

      {/* Warning */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Funcionalidade Experimental</p>
              <p className="text-yellow-700 mt-1">
                A Memória Inteligente usa IA para criar resumos e extrair informações importantes. 
                Isso pode consumir mais tokens, mas oferece contexto muito mais rico.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intelligent Memory Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            Sistema de Memória Inteligente
          </CardTitle>
          <CardDescription>
            Ative para usar IA avançada no processamento de conversas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Ativar Memória Inteligente</p>
              <p className="text-sm text-muted-foreground">
                O bot lembrará de informações importantes através de 3 camadas de memória
              </p>
            </div>
            <Switch
              checked={config.useIntelligentMemory}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, useIntelligentMemory: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Memory Configuration */}
      {config.useIntelligentMemory && (
        <div className="space-y-6">
          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como Funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-blue-900">Memória Imediata</h4>
                    <p className="text-sm text-blue-700">Últimas mensagens da conversa atual</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <Archive className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-green-900">Memória de Trabalho</h4>
                    <p className="text-sm text-green-700">Resumos automáticos de sessões</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-purple-900">Memória Persistente</h4>
                    <p className="text-sm text-purple-700">Informações importantes sobre você</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Memory Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Memória</CardTitle>
              <CardDescription>
                Ajuste como o sistema processa e armazena informações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Immediate Memory */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="font-medium">Memória Imediata</Label>
                  <Badge variant="outline">{config.memorySettings.immediateMemorySize} mensagens</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Quantas mensagens recentes manter em contexto direto
                </p>
                <Slider
                  value={[config.memorySettings.immediateMemorySize]}
                  onValueChange={([value]) => 
                    setConfig(prev => ({
                      ...prev,
                      memorySettings: { ...prev.memorySettings, immediateMemorySize: value }
                    }))
                  }
                  max={10}
                  min={3}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>3 (econômico)</span>
                  <span>10 (detalhado)</span>
                </div>
              </div>

              {/* Summarization Threshold */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="font-medium">Limite para Sumarização</Label>
                  <Badge variant="outline">{config.memorySettings.summarizationThreshold} mensagens</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Quando começar a criar resumos da conversa
                </p>
                <Slider
                  value={[config.memorySettings.summarizationThreshold]}
                  onValueChange={([value]) => 
                    setConfig(prev => ({
                      ...prev,
                      memorySettings: { ...prev.memorySettings, summarizationThreshold: value }
                    }))
                  }
                  max={30}
                  min={10}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>10 (frequente)</span>
                  <span>30 (raro)</span>
                </div>
              </div>

              {/* Working Memory */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="font-medium">Memória de Trabalho</Label>
                  <Badge variant="outline">{config.memorySettings.workingMemorySize} resumos</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Quantos resumos de sessões anteriores manter
                </p>
                <Slider
                  value={[config.memorySettings.workingMemorySize]}
                  onValueChange={([value]) => 
                    setConfig(prev => ({
                      ...prev,
                      memorySettings: { ...prev.memorySettings, workingMemorySize: value }
                    }))
                  }
                  max={20}
                  min={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5 (básico)</span>
                  <span>20 (extensivo)</span>
                </div>
              </div>

              {/* Long Term Memory */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="font-medium">Memória Persistente</Label>
                  <Badge variant="outline">{config.memorySettings.longTermMemorySize} informações</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Quantas informações importantes manter permanentemente
                </p>
                <Slider
                  value={[config.memorySettings.longTermMemorySize]}
                  onValueChange={([value]) => 
                    setConfig(prev => ({
                      ...prev,
                      memorySettings: { ...prev.memorySettings, longTermMemorySize: value }
                    }))
                  }
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 (mínimo)</span>
                  <span>10 (máximo)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Como isso me ajuda?</p>
                  <ul className="text-blue-800 mt-2 space-y-1 list-disc list-inside">
                    <li>Bot lembra informações importantes sobre você entre conversas</li>
                    <li>Contexto mais rico sem enviar mensagens antigas desnecessárias</li>
                    <li>Resumos automáticos de conversas longas</li>
                    <li>Redução no consumo de tokens mantendo qualidade</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Button */}
      <div className="flex gap-3 pt-6 border-t">
        <Button 
          onClick={saveAdvancedSettings} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações Avançadas
            </>
          )}
        </Button>
      </div>
    </div>
  );
}