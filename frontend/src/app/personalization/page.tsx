'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw, Palette } from 'lucide-react';

interface PersonalizationConfig {
  userId: string;
  phone: string;
  ai: {
    personality?: string;
    importantInfo?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
  bot: {
    customName?: string;
    customGreeting?: string;
  };
  preferences: {
    language?: 'pt' | 'en' | 'es';
    timezone?: string;
    responseStyle?: 'formal' | 'casual' | 'friendly' | 'professional';
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

const responseStyles = [
  { value: 'formal', label: 'Formal', description: 'Linguagem respeitosa e profissional' },
  { value: 'casual', label: 'Descontraído', description: 'Linguagem casual e relaxada' },
  { value: 'friendly', label: 'Amigável', description: 'Linguagem acolhedora e simpática' },
  { value: 'professional', label: 'Profissional', description: 'Linguagem técnica e direta' },
];

export default function PersonalizationPage() {
  const [config, setConfig] = useState<PersonalizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { user, getToken } = useAuth();
  const { addToast } = useToast();

  // Form state
  const [personality, setPersonality] = useState('');
  const [importantInfo, setImportantInfo] = useState('');
  const [customName, setCustomName] = useState('');
  const [customGreeting, setCustomGreeting] = useState('');
  const [responseStyle, setResponseStyle] = useState<string>('friendly');

  // Load user's current personalization
  useEffect(() => {
    loadPersonalization();
  }, []);

  const loadPersonalization = async () => {
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
        setConfig(data.data);
        
        // Update form fields
        setPersonality(data.data.ai.personality || '');
        setImportantInfo(data.data.ai.importantInfo || '');
        setCustomName(data.data.bot.customName || '');
        setCustomGreeting(data.data.bot.customGreeting || '');
        setResponseStyle(data.data.preferences.responseStyle || 'friendly');
      } else {
        console.error('Failed to load personalization:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading personalization:', error);
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar suas personalizações.',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePersonalization = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      
      const updateData = {
        ai: {
          ...(personality && { personality }),
          ...(importantInfo && { importantInfo }),
        },
        bot: {
          ...(customName && { customName }),
          ...(customGreeting && { customGreeting }),
        },
        preferences: {
          responseStyle,
        },
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
        const data = await response.json();
        setConfig(data.data);
        addToast({
          type: 'success',
          title: 'Personalização salva!',
          description: 'Suas preferências foram atualizadas com sucesso.',
        });
      } else {
        throw new Error('Failed to save personalization');
      }
    } catch (error) {
      console.error('Error saving personalization:', error);
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar suas personalizações.',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetPersonalization = async () => {
    try {
      setResetting(true);
      const token = await getToken();
      
      const response = await fetch('/api/user/personalization/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.data);
        
        // Reset form fields
        setPersonality('');
        setImportantInfo('');
        setCustomName('');
        setCustomGreeting('');
        setResponseStyle('friendly');
        
        addToast({
          type: 'success',
          title: 'Personalização resetada',
          description: 'Suas preferências foram restauradas para os padrões.',
        });
      } else {
        throw new Error('Failed to reset personalization');
      }
    } catch (error) {
      console.error('Error resetting personalization:', error);
      addToast({
        type: 'error',
        title: 'Erro ao resetar',
        description: 'Não foi possível resetar suas personalizações.',
      });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando personalizações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Palette className="h-6 w-6 text-whatsapp-green" />
          <h1 className="text-2xl font-bold">Personalização do Bot</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Configure como você gostaria que o ZecaBot interaja com você
        </p>
      </div>

      <div className="grid gap-6">
        {/* Personalidade */}
        <Card>
          <CardHeader>
            <CardTitle>Personalidade</CardTitle>
            <CardDescription>
              Defina como você gostaria que o bot se comporte nas conversas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="personality">Personalidade do Bot</Label>
              <textarea
                id="personality"
                className="mt-1 w-full min-h-[100px] p-3 border rounded-md resize-none"
                placeholder="Ex: Seja mais enérgico e entusiástico nas respostas, use emojis quando apropriado..."
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="important-info">Informações Importantes</Label>
              <textarea
                id="important-info"
                className="mt-1 w-full min-h-[80px] p-3 border rounded-md resize-none"
                placeholder="Ex: Este usuário trabalha com vendas online, prefere respostas diretas..."
                value={importantInfo}
                onChange={(e) => setImportantInfo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Estilo de Resposta */}
        <Card>
          <CardHeader>
            <CardTitle>Estilo de Resposta</CardTitle>
            <CardDescription>
              Escolha o tom das respostas do bot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {responseStyles.map((style) => (
                <div
                  key={style.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    responseStyle === style.value
                      ? 'border-whatsapp-green bg-whatsapp-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setResponseStyle(style.value)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{style.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {style.description}
                      </div>
                    </div>
                    {responseStyle === style.value && (
                      <Badge className="bg-whatsapp-green">Selecionado</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customizações do Bot */}
        <Card>
          <CardHeader>
            <CardTitle>Customizações</CardTitle>
            <CardDescription>
              Personalize nome e saudação do bot (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="custom-name">Nome Personalizado do Bot</Label>
              <Input
                id="custom-name"
                placeholder="Ex: MeuAssistente (deixe vazio para usar ZecaBot)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="custom-greeting">Saudação Personalizada</Label>
              <Input
                id="custom-greeting"
                placeholder="Ex: Olá! Sou seu assistente pessoal..."
                value={customGreeting}
                onChange={(e) => setCustomGreeting(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Info atual */}
        {config && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Última atualização: {new Date(config.updatedAt).toLocaleString('pt-BR')}</p>
                <p>Atualizado por: {config.updatedBy}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
        <Button 
          onClick={savePersonalization} 
          disabled={saving}
          className="bg-whatsapp-green hover:bg-whatsapp-green/90"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Personalizações
            </>
          )}
        </Button>

        <Button 
          onClick={resetPersonalization} 
          disabled={resetting}
          variant="outline"
        >
          {resetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetando...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Resetar para Padrão
            </>
          )}
        </Button>
      </div>
    </div>
  );
}