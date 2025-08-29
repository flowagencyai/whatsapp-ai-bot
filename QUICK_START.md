# 🚀 Guia de Início Rápido

Este guia te ajudará a ter o bot funcionando em minutos!

## 📋 Pré-requisitos Rápidos

- ✅ Node.js 18+
- ✅ Redis (Docker recomendado)
- ✅ Chaves API (OpenAI + Groq)

## ⚡ Setup Automático

```bash
# 1. Execute o setup automático
npm run setup

# 2. Configure suas chaves API no .env
nano .env
```

### 🔑 Chaves API Necessárias

```bash
# .env
OPENAI_API_KEY=sk-sua-chave-openai-aqui
GROQ_API_KEY=gsk_sua-chave-groq-aqui
```

**Onde obter:**
- OpenAI: https://platform.openai.com/api-keys
- Groq (gratuita): https://console.groq.com/keys

## 🐳 Opção 1: Docker (Recomendado)

```bash
# Inicia Redis + Bot
npm run docker:run

# Logs em tempo real
npm run docker:logs
```

## 💻 Opção 2: Local

```bash
# 1. Inicia Redis
docker run -d -p 6379:6379 redis:alpine
# ou
redis-server

# 2. Inicia o bot
npm run dev
```

## 📱 Conectar WhatsApp

1. Execute o bot
2. Escaneie o QR Code no terminal
3. ✅ Bot conectado!

## 🧪 Testar Funcionamento

```bash
# Health check
curl http://localhost:3000/health

# Status detalhado
curl http://localhost:3000/status

# Enviar mensagem teste
npm run tools test-send "5511999999999@s.whatsapp.net" "Olá!"
```

## 📝 Comandos no WhatsApp

| Comando | Ação |
|---------|------|
| `RESET` | Reinicia conversa |
| `PAUSE` | Pausa bot |
| `RESUME` | Retoma bot |
| `STATUS` | Mostra status |
| `HELP` | Lista comandos |

## 🛠️ Ferramentas de Debug

```bash
# Logs em tempo real
npm run tools logs

# Status dos serviços
npm run tools health

# Monitor contínuo
npm run tools monitor

# Pausar usuário
npm run tools pause-user "5511999999999@s.whatsapp.net"
```

## ❗ Problemas Comuns

### QR Code não aparece
```bash
# Delete sessões antigas
rm -rf sessions/*
npm run dev
```

### Redis não conecta
```bash
# Verifica se Redis está rodando
npm run tools redis

# Inicia Redis via Docker
docker run -d -p 6379:6379 redis:alpine
```

### Bot não responde
```bash
# Verifica logs
npm run tools logs

# Status dos serviços
npm run tools status
```

## 🔧 Configurações Avançadas

### Performance
```bash
# .env
MESSAGE_TIMEOUT=30000
MAX_CONTEXT_MESSAGES=20
RATE_LIMIT_MAX_REQUESTS=15
```

### Logging
```bash
# .env
LOG_LEVEL=debug  # Para debug detalhado
LOG_LEVEL=info   # Para produção
```

## 📈 Monitoramento

### Métricas Importantes
- `GET /health` - Status geral
- `GET /status` - Detalhes completos
- Logs estruturados em `logs/bot.log`

### Alertas Recomendados
- Conexão WhatsApp perdida
- Redis indisponível
- Alto uso de tokens IA

## 🎯 Próximos Passos

1. **Personalize o bot**: Edite prompts em `src/services/ai/openai.ts`
2. **Adicione funcionalidades**: Novos handlers em `src/handlers/`
3. **Configure produção**: Use Docker + reverse proxy
4. **Monitore**: Configure alertas e dashboards

## 🆘 Suporte

- 📖 Documentação completa: [README.md](README.md)
- 🐛 Reportar bugs: [GitHub Issues]
- 💬 Dúvidas: [Discussões]

---

**🎉 Bot funcionando? Ótimo! Agora personalize para suas necessidades!**