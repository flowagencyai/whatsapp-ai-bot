# WhatsApp Bot Dashboard

Dashboard moderno para gerenciamento do WhatsApp Bot, construído com Next.js 14, TypeScript e Tailwind CSS.

## 🚀 Funcionalidades

- **Dashboard em Tempo Real**: Visualização de estatísticas e status do bot
- **QR Code Display**: Interface para autenticação do WhatsApp
- **Gerenciamento de Conversas**: Lista e controle de todas as conversas
- **Sistema de Logs**: Monitoramento detalhado de eventos
- **Configurações Avançadas**: Personalização completa do comportamento do bot
- **WebSocket Integration**: Updates em tempo real
- **Interface Responsiva**: Funciona perfeitamente em todos os dispositivos

## 🛠 Stack Tecnológica

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utility-first
- **Radix UI** - Componentes acessíveis
- **Socket.io Client** - Comunicação WebSocket
- **Lucide React** - Ícones modernos
- **Recharts** - Gráficos e visualizações

## 📦 Instalação

1. **Clone o repositório e navegue para o diretório frontend:**
   ```bash
   cd frontend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.local.example .env.local
   # Edite as variáveis conforme necessário
   ```

4. **Execute o projeto:**
   ```bash
   npm run dev
   ```

5. **Acesse o dashboard:**
   ```
   http://localhost:3001
   ```

## 🏗 Estrutura do Projeto

```
frontend/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── page.tsx           # Dashboard principal
│   │   ├── qr/                # Página do QR Code
│   │   ├── conversations/     # Gerenciamento de conversas
│   │   ├── logs/             # Visualização de logs
│   │   └── settings/         # Configurações
│   ├── components/
│   │   ├── ui/               # Componentes base (Radix UI)
│   │   ├── dashboard/        # Componentes do dashboard
│   │   ├── navigation/       # Header e Sidebar
│   │   └── qr-code/         # Componentes do QR Code
│   ├── hooks/
│   │   ├── useWebSocket.ts   # Hook para WebSocket
│   │   ├── useBotStatus.ts   # Hook para status do bot
│   │   └── useDashboardStats.ts # Hook para estatísticas
│   ├── lib/
│   │   ├── api.ts            # Cliente da API
│   │   └── utils.ts          # Utilitários
│   ├── providers/
│   │   └── WebSocketProvider.tsx # Provider do WebSocket
│   └── types/
│       └── index.ts          # Definições TypeScript
```

## 🔌 API Integration

O frontend se conecta com o backend através de:

- **REST API**: `http://localhost:3000/api`
- **WebSocket**: `http://localhost:3000` (Socket.io)

### Endpoints Principais:

- `GET /api/bot/status` - Status do bot
- `GET /api/bot/qr` - QR Code atual
- `POST /api/bot/start` - Iniciar bot
- `POST /api/bot/stop` - Parar bot
- `GET /api/conversations` - Listar conversas
- `GET /api/logs` - Listar logs
- `GET /api/dashboard/stats` - Estatísticas

## 📱 Páginas

### Dashboard (`/`)
- Status do bot em tempo real
- Estatísticas resumidas
- Atividade recente
- Métricas de performance

### QR Code (`/qr`)
- Display do QR Code para autenticação
- Instruções detalhadas
- Status da conexão
- Auto-refresh do código

### Conversas (`/conversations`)
- Lista de todas as conversas
- Filtros e busca
- Controles de pausa/retomada
- Estatísticas por status

### Logs (`/logs`)
- Histórico completo de eventos
- Filtros por nível e categoria
- Busca em tempo real
- Exportação de logs

### Configurações (`/settings`)
- Horário de funcionamento
- Mensagens automáticas
- Controle de acesso
- Configurações gerais

## 🎨 Componentes UI

O projeto utiliza uma biblioteca de componentes personalizada baseada em Radix UI:

- **Button** - Botões com variantes
- **Card** - Cartões de conteúdo
- **Badge** - Indicadores de status
- **Avatar** - Imagens de perfil
- **Skeleton** - Loading states
- E muitos outros...

## 🔄 Estado Global

O estado é gerenciado através de:

- **React Context** - WebSocket connection
- **Custom Hooks** - Lógica específica de domínio
- **Local State** - Estado de componentes

## 🌐 WebSocket Events

O dashboard escuta os seguintes eventos:

- `bot-status` - Mudanças no status do bot
- `qr-code` - Novo QR Code gerado
- `dashboard-stats` - Atualização de estatísticas
- `log-entry` - Novas entradas de log
- `conversation-update` - Mudanças em conversas
- `message-update` - Novas mensagens

## 📊 Características Técnicas

- **Performance**: Otimizado para carregamento rápido
- **Responsividade**: Design mobile-first
- **Acessibilidade**: Componentes acessíveis (WCAG)
- **Tipagem**: TypeScript estrito
- **Real-time**: Updates instantâneos via WebSocket
- **Error Handling**: Tratamento robusto de erros
- **Loading States**: Esqueletos para melhor UX

## 🔧 Desenvolvimento

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm run start

# Verificação de tipos
npm run type-check

# Linting
npm run lint
```

## 📝 Customização

### Temas
- Dark/Light mode suportado
- Cores personalizáveis via CSS variables
- Componentes temáticos

### API
- Endpoints configuráveis
- Interceptors para autenticação
- Error handling centralizado

### WebSocket
- Reconnection automática
- Heartbeat monitoring
- Event-driven architecture

## 🤝 Integração com Backend

O dashboard foi projetado para funcionar perfeitamente com o backend WhatsApp Bot que roda na porta 3000. Certifique-se de que o backend esteja rodando antes de iniciar o frontend.

## 🐛 Troubleshooting

### Problemas Comuns:

1. **API Connection Failed**: Verifique se o backend está rodando na porta 3000
2. **WebSocket não conecta**: Confirme as configurações de CORS no backend
3. **QR Code não aparece**: Certifique-se de que o bot está no estado correto

### Debug:

```bash
# Verificar logs do console
# Inspecionar Network tab
# Verificar WebSocket connection
```

## 📄 Licença

Este projeto é parte do sistema WhatsApp Bot e segue a mesma licença do projeto principal.