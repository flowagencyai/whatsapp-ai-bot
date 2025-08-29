# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsApp AI Bot built with Baileys, TypeScript, and AI integration featuring OpenAI GPT-4o-mini for intelligent responses, Groq Whisper Large-v3 for audio transcription, and GPT-4o-mini Vision for image analysis. The system includes Redis caching, rate limiting, and a Next.js dashboard frontend.

## Development Commands

### Core Commands
```bash
# Development (watch mode)
npm run dev

# Build TypeScript
npm run build

# Production start
npm start

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Testing
npm test
npm run test:watch
npm run test:coverage
```

### Docker Operations
```bash
# Run full stack with Redis
npm run docker:run

# Build Docker image
npm run docker:build

# Stop containers
npm run docker:stop

# View logs
npm run docker:logs
```

### Setup and Utilities
```bash
# Initial setup (creates dirs, installs deps, builds)
npm run setup

# Development tools
npm run tools

# Health check
npm run health
# or: curl http://localhost:3000/health

# Clean build artifacts and logs
npm run clean
```

## Architecture Overview

### Backend Structure (`src/`)
- **`index.ts`**: Main application entry point with Express server and WhatsApp bot initialization
- **`config/env.ts`**: Comprehensive environment configuration with Zod validation
- **`connection/whatsapp.ts`**: Baileys WhatsApp connection management with QR code generation
- **`handlers/messageHandler.ts`**: Core message processing logic
- **`services/`**: Modular services architecture
  - **`ai/openai.ts`**: OpenAI/DeepSeek integration for text generation
  - **`media/audioProcessor.ts`**: Audio processing with Groq Whisper integration
  - **`memory/`**: Redis client and in-memory cache implementations
  - **`queue/`**: Background job processing (Bull queue)
- **`types/index.ts`**: Centralized TypeScript type definitions
- **`utils/logger.ts`**: Structured logging with Pino

### Frontend Structure (`frontend/`)
- **Next.js 14** dashboard on port 3001
- **Components**: Modular React components with shadcn/ui
- **WebSocket integration** for real-time updates
- **TypeScript** throughout with strict typing

### Key Design Patterns
- **Singleton Services**: Redis, WhatsApp connection, and message handler use singleton pattern
- **Event-Driven Architecture**: WhatsApp events trigger message processing pipeline
- **Graceful Shutdown**: Comprehensive cleanup on SIGINT/SIGTERM
- **Health Checks**: All services implement healthCheck() methods
- **Error Boundaries**: Express error handlers and service-level error handling

## Configuration Management

### Environment Variables
All configuration is managed through `src/config/env.ts` with Zod validation:

**Required Variables:**
- `OPENAI_API_KEY`: DeepSeek/OpenAI API key
- Redis connection details (host, port, optional password)

**Optional but Recommended:**
- `GROQ_API_KEY`: For free audio transcription (Whisper Large-v3)
- `OPENAI_BASE_URL`: For DeepSeek API endpoint

### API Integration Priorities
1. **Groq Whisper Large-v3**: Free audio transcription (3x faster than OpenAI)
2. **GPT-4o-mini Vision**: Cost-effective image analysis (60% cheaper)
3. **DeepSeek Chat**: Primary text generation model

## Key Features

### Message Processing Pipeline
1. **Webhook Reception**: Messages received via Baileys WebSocket
2. **Command Detection**: Built-in commands (RESET, PAUSE, RESUME, PDF, STATUS, HELP)
3. **Media Handling**: Separate download and processing for audio/images
4. **AI Processing**: Context-aware responses with Redis-cached conversation history
5. **Rate Limiting**: Per-user rate limiting (10 messages/minute default)
6. **Response Delivery**: Async message sending with error handling

### Supported Message Types
- **Text**: Direct AI processing with context
- **Audio**: Groq Whisper transcription → AI response
- **Images**: GPT-4o-mini Vision analysis → AI response
- **Commands**: System control commands for bot management

### Caching Strategy
- **Context Storage**: User conversation history (3600s TTL)
- **Pause States**: Temporary bot pause per user (3600s TTL)
- **User States**: Extended user data (7200s TTL)
- **Redis Fallback**: In-memory cache when Redis unavailable

## API Endpoints

### Health and Status
- `GET /health`: Service health status
- `GET /status`: Detailed system information
- `GET /api/qr`: QR code for WhatsApp connection
- `GET /api/bot-status`: Bot connection status

### Message Management
- `POST /send-message`: Send manual messages
- `POST /users/:userId/pause`: Pause user
- `POST /users/:userId/resume`: Resume user
- `DELETE /users/:userId/context`: Clear user context

## Testing Strategy

### Test Structure
- **Unit Tests**: Service-level testing with Jest
- **Integration Tests**: Redis and API endpoint testing
- **Coverage Requirements**: 70% threshold for branches, functions, lines
- **Test Environment**: Isolated Node.js environment with mocks

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
```

## Development Workflow

### Adding New Features
1. **Define Types**: Add TypeScript interfaces in `src/types/`
2. **Implement Service**: Create service in appropriate `src/services/` subdirectory
3. **Update Handlers**: Modify `messageHandler.ts` if processing new message types
4. **Add Tests**: Create corresponding test files in `tests/`
5. **Update Configuration**: Add any new environment variables to `env.ts`

### Security Considerations
- **Input Validation**: Zod schemas for all configuration and external data
- **Rate Limiting**: Implemented per-user to prevent spam
- **Sanitization**: All user inputs sanitized before processing
- **Secret Management**: Environment variables for all sensitive data
- **CORS**: Restricted to localhost:3002 for frontend
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

### Performance Optimizations
- **Async Processing**: Non-blocking message processing
- **Connection Pooling**: Redis connection reuse
- **Media Streaming**: File-based media handling to prevent memory issues
- **Context Limits**: Maximum 10 messages per user context
- **Timeout Management**: Configurable timeouts for all external calls

## Common Issues and Solutions

### WhatsApp Connection
- **QR Code Issues**: Delete `sessions/` directory and restart
- **Connection Drops**: Automatic reconnection with exponential backoff

### Redis Connection
- **Connection Failures**: Falls back to in-memory cache
- **Memory Issues**: Configurable TTL values for cache cleanup

### API Rate Limits
- **OpenAI Limits**: Automatic retry with exponential backoff
- **Groq Integration**: Free tier with generous limits for Whisper

### File Handling
- **Large Media Files**: Size limits enforced (16MB audio, 5MB images)
- **Temp File Cleanup**: Automatic cleanup on graceful shutdown

## Frontend Dashboard

The Next.js dashboard (`frontend/`) provides:
- **Real-time Status**: WebSocket connection for live updates
- **QR Code Display**: Visual QR code for easy WhatsApp connection
- **Conversation Monitoring**: Chat history and user interaction tracking
- **System Health**: Service status and performance metrics

### Frontend Development
```bash
cd frontend
npm run dev     # Development server on port 3001
npm run build   # Production build
npm start       # Production server
```

## Monitoring and Logs

### Structured Logging
- **Pino Logger**: High-performance JSON logging
- **Log Levels**: Configurable via LOG_LEVEL environment variable
- **Log Rotation**: Automatic log file rotation with size limits
- **Context Logging**: Request correlation and metadata inclusion

### Health Monitoring
- **Service Health Checks**: Individual service status monitoring
- **Memory Usage**: Process memory tracking
- **Uptime Metrics**: System availability monitoring
- **Connection Status**: Real-time WhatsApp and Redis connection status