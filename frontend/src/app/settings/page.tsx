'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save, 
  RotateCcw,
  Bell,
  Clock,
  Users,
  MessageSquare,
  Shield,
  Zap
} from 'lucide-react';
import Link from 'next/link';

// Mock settings data
const mockSettings = {
  autoResponse: true,
  responseDelay: 2000,
  maxConversationsPerHour: 50,
  allowedNumbers: ['+55 11 99999-9999', '+55 11 88888-8888'],
  blockedNumbers: ['+55 11 77777-7777'],
  businessHours: {
    enabled: true,
    start: '09:00',
    end: '18:00',
    timezone: 'America/Sao_Paulo',
  },
  welcomeMessage: 'Olá! Como posso ajudar você hoje?',
  awayMessage: 'No momento estamos fora do horário de atendimento. Retornaremos em breve!',
  commandPrefix: '/',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(mockSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleNestedInputChange = (parentKey: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey as keyof typeof prev] as any,
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(mockSettings);
    setHasChanges(false);
  };

  const addAllowedNumber = () => {
    const number = prompt('Digite o número a ser permitido (ex: +55 11 99999-9999):');
    if (number) {
      setSettings(prev => ({
        ...prev,
        allowedNumbers: [...prev.allowedNumbers, number]
      }));
      setHasChanges(true);
    }
  };

  const removeAllowedNumber = (index: number) => {
    setSettings(prev => ({
      ...prev,
      allowedNumbers: prev.allowedNumbers.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  const addBlockedNumber = () => {
    const number = prompt('Digite o número a ser bloqueado (ex: +55 11 99999-9999):');
    if (number) {
      setSettings(prev => ({
        ...prev,
        blockedNumbers: [...prev.blockedNumbers, number]
      }));
      setHasChanges(true);
    }
  };

  const removeBlockedNumber = (index: number) => {
    setSettings(prev => ({
      ...prev,
      blockedNumbers: prev.blockedNumbers.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure o comportamento do WhatsApp Bot
          </p>
        </div>

        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="warning">Alterações não salvas</Badge>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
          
          <Button 
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Configurações básicas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Resposta Automática</label>
                <p className="text-xs text-muted-foreground">
                  Ativar respostas automáticas para mensagens recebidas
                </p>
              </div>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoResponse ? 'bg-primary' : 'bg-gray-200'
                }`}
                onClick={() => handleInputChange('autoResponse', !settings.autoResponse)}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoResponse ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Atraso na Resposta (ms)</label>
              <input
                type="number"
                value={settings.responseDelay}
                onChange={(e) => handleInputChange('responseDelay', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                min="0"
                max="10000"
              />
              <p className="text-xs text-muted-foreground">
                Tempo de espera antes de enviar a resposta (0-10000ms)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Máximo de Conversas por Hora</label>
              <input
                type="number"
                value={settings.maxConversationsPerHour}
                onChange={(e) => handleInputChange('maxConversationsPerHour', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                min="1"
                max="1000"
              />
              <p className="text-xs text-muted-foreground">
                Limite de novas conversas que podem ser iniciadas por hora
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horário de Funcionamento
            </CardTitle>
            <CardDescription>
              Configure os horários de atendimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Ativar Horário de Funcionamento</label>
                <p className="text-xs text-muted-foreground">
                  Responder apenas dentro do horário configurado
                </p>
              </div>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.businessHours.enabled ? 'bg-primary' : 'bg-gray-200'
                }`}
                onClick={() => handleNestedInputChange('businessHours', 'enabled', !settings.businessHours.enabled)}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.businessHours.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Horário de Início</label>
                <input
                  type="time"
                  value={settings.businessHours.start}
                  onChange={(e) => handleNestedInputChange('businessHours', 'start', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={!settings.businessHours.enabled}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Horário de Fim</label>
                <input
                  type="time"
                  value={settings.businessHours.end}
                  onChange={(e) => handleNestedInputChange('businessHours', 'end', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={!settings.businessHours.enabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Mensagens
            </CardTitle>
            <CardDescription>
              Configure as mensagens automáticas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem de Boas-vindas</label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => handleInputChange('welcomeMessage', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Digite a mensagem de boas-vindas..."
              />
              <p className="text-xs text-muted-foreground">
                Mensagem enviada quando uma nova conversa é iniciada
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem de Ausência</label>
              <textarea
                value={settings.awayMessage}
                onChange={(e) => handleInputChange('awayMessage', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Digite a mensagem de ausência..."
              />
              <p className="text-xs text-muted-foreground">
                Mensagem enviada fora do horário de funcionamento
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Access Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Controle de Acesso
            </CardTitle>
            <CardDescription>
              Gerencie números permitidos e bloqueados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Allowed Numbers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Números Permitidos</label>
                <Button size="sm" onClick={addAllowedNumber}>
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {settings.allowedNumbers.map((number, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span className="text-sm">{number}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeAllowedNumber(index)}>
                      Remover
                    </Button>
                  </div>
                ))}
                {settings.allowedNumbers.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum número configurado</p>
                )}
              </div>
            </div>

            {/* Blocked Numbers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Números Bloqueados</label>
                <Button size="sm" onClick={addBlockedNumber}>
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {settings.blockedNumbers.map((number, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span className="text-sm">{number}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeBlockedNumber(index)}>
                      Remover
                    </Button>
                  </div>
                ))}
                {settings.blockedNumbers.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum número bloqueado</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}