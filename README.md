# WhatsApp AI Bot

Bot WhatsApp inteligente construído com Baileys, TypeScript e integração com IA para atendimento automatizado.

## 🚀 Funcionalidades

- **Conexão WhatsApp via Baileys**: Conecta diretamente via QR Code
- **Integração com IA**: OpenAI GPT-4o-mini para respostas inteligentes
- **Transcrição de Áudio**: Groq Whisper Large-v3 (gratuito e rápido)
- **Análise de Imagens**: GPT-4o-mini Vision para análise visual
- **Sistema de Comandos**: RESET, PAUSE, RESUME, PDF, STATUS, HELP
- **Cache Inteligente**: Redis para contexto e controle de estado
- **Rate Limiting**: Controle de spam e uso excessivo
- **Logging Robusto**: Sistema de logs estruturado com Pino
- **Reconexão Automática**: Recuperação automática de conexão
- **API RESTful**: Endpoints para gerenciamento e monitoramento

## 🏗️ Arquitetura

```
src/
├── config/           # Configurações e variáveis de ambiente
├── connection/       # Conexão WhatsApp Baileys
├── handlers/         # Processamento de mensagens
├── services/         # Serviços (IA, mídia, memória)
│   ├── ai/          # Integração OpenAI
│   ├── media/       # Processamento de áudio/imagem
│   └── memory/      # Redis e cache
├── types/           # Tipos TypeScript
└── utils/           # Utilitários (logger)
```

## 📋 Pré-requisitos

- Node.js 18+ 
- Redis 6+
- Contas API:
  - OpenAI (com GPT-4o-mini)
  - Groq (para Whisper - gratuita)

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone <repo-url>
cd whatsappbot
```

2. **Instale dependências**
```bash
npm install
```

3. **Configure variáveis de ambiente**
```bash
cp .env.example .env
# Edite .env com suas credenciais
```

4. **Configure Redis**
```bash
# Docker Compose (recomendado)
docker-compose up -d redis

# Ou instale localmente
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis
```

## ⚙️ Configuração

### Variáveis de Ambiente Obrigatórias

```bash
# APIs
OPENAI_API_KEY=sk-your-openai-api-key
GROQ_API_KEY=gsk_your-groq-api-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Obter Chaves API

1. **OpenAI**: https://platform.openai.com/api-keys
2. **Groq**: https://console.groq.com/keys (gratuita)

## 🚀 Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

### Docker
```bash
docker-compose up -d
```

## 📱 Uso

### Primeira Conexão
1. Execute o bot
2. Escaneie o QR Code que aparece no terminal
3. Bot estará ativo após autenticação

### Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `RESET` | Reinicia a conversa |
| `PAUSE [minutos]` | Pausa o atendimento |
| `RESUME` | Retoma o atendimento |
| `PDF` | Gera resumo da conversa |
| `STATUS` | Mostra status da conversa |
| `HELP` | Lista comandos disponíveis |

### Tipos de Mensagem Suportados

- **Texto**: Resposta via IA
- **Áudio**: Transcrição → Resposta IA
- **Imagem**: Análise visual → Resposta IA
- **Comandos**: Ações específicas do bot

## 🔍 Monitoramento

### Endpoints API

- `GET /health` - Status de saúde
- `GET /status` - Status detalhado
- `POST /send-message` - Enviar mensagem
- `POST /users/:userId/pause` - Pausar usuário
- `POST /users/:userId/resume` - Retomar usuário
- `DELETE /users/:userId/context` - Limpar contexto

### Logs

```bash
# Logs em tempo real
tail -f logs/bot.log

# Logs estruturados no console (desenvolvimento)
npm run dev
```

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes em modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## 🔧 Desenvolvimento

### Estrutura do Código

- **Singleton Pattern**: Serviços únicos instanciados
- **Event-Driven**: Comunicação via eventos
- **Error Handling**: Tratamento robusto de erros
- **Type Safety**: TypeScript com tipos rigorosos
- **Logging**: Logs estruturados e contextuais

### Adicionar Nova Funcionalidade

1. Crie tipos em `src/types/`
2. Implemente serviço em `src/services/`
3. Adicione handler se necessário
4. Atualize testes
5. Documente mudanças

## 📊 Performance

### Otimizações Implementadas

- **APIs Gratuitas**: Groq Whisper > OpenAI Whisper
- **Modelos Eficientes**: GPT-4o-mini (60% mais barato)
- **Cache Redis**: Contextos e estados
- **Processamento Assíncrono**: Non-blocking
- **Rate Limiting**: Controle de uso
- **Reconexão Inteligente**: Backoff exponencial

### Limites Recomendados

- **Áudio**: 16MB máximo
- **Imagem**: 5MB máximo  
- **Contexto**: 10 mensagens por usuário
- **Rate Limit**: 10 msg/min por usuário

## 🔐 Segurança

- ✅ Validação de entrada
- ✅ Rate limiting por usuário
- ✅ Logs de auditoria
- ✅ Sanitização de dados
- ✅ Headers de segurança
- ✅ Timeout em requisições
- ✅ Graceful shutdown

## 🐛 Troubleshooting

### Problemas Comuns

1. **QR Code não aparece**
   - Verifique se a pasta `sessions/` existe
   - Delete sessões antigas se necessário

2. **Erro de conexão Redis**
   - Confirme se Redis está rodando
   - Verifique credenciais no `.env`

3. **API OpenAI falha**
   - Verifique saldo da conta
   - Confirme chave API válida

4. **Bot não responde**
   - Verifique logs em `logs/bot.log`
   - Teste endpoint `/health`

### Debug

```bash
# Logs detalhados
LOG_LEVEL=debug npm run dev

# Status dos serviços
curl http://localhost:3000/status

# Health check
curl http://localhost:3000/health
```

## 📈 Monitoramento Produção

### Métricas Importantes

- Uptime da conexão WhatsApp
- Usage tokens OpenAI/Groq
- Cache hit ratio Redis
- Latência de resposta
- Rate de erro por usuário

### Alertas Recomendados

- Conexão WhatsApp perdida
- Redis indisponível  
- Alto uso de tokens IA
- Muitos erros de rate limit

## 🤝 Contribuição

1. Fork o projeto
2. Crie feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit mudanças (`git commit -am 'Add nova funcionalidade'`)
4. Push branch (`git push origin feature/nova-funcionalidade`)
5. Abra Pull Request

## 📜 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- 📧 Email: [seu-email]
- 💬 Issues: [GitHub Issues]
- 📖 Docs: [Documentação]

---

**Desenvolvido com ❤️ usando TypeScript, Baileys e IA**