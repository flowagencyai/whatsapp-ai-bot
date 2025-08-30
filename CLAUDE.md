# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZecaBot - Sistema inteligente de automação WhatsApp construído com Baileys, TypeScript, and AI integration featuring OpenAI GPT-4o-mini for intelligent responses, Groq Whisper Large-v3 for audio transcription, and GPT-4o-mini Vision for image analysis. The system includes Redis caching, rate limiting, authentication system, admin dashboard, email verification, personalization features, and intelligent 3-layer memory management.

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
  - **`ai/`**: AI integrations (OpenAI/DeepSeek, LangChain)
  - **`media/audioProcessor.ts`**: Audio processing with Groq Whisper integration
  - **`memory/`**: Redis client, in-memory cache, and intelligent memory management
  - **`admin/`**: Configuration and statistics management
  - **`auth/`**: Authentication service with JWT
  - **`email/`**: Email verification system with Gmail SMTP
  - **`personalization/`**: User personalization and conversation customization
- **`middleware/auth.ts`**: JWT authentication middleware
- **`routes/`**: API route handlers (auth, admin, user)
- **`types/`**: TypeScript type definitions (main, auth, admin)
- **`utils/logger.ts`**: Structured logging with Pino

### Frontend Structure (`frontend/`)
- **Next.js 14** dashboard on port 3001
- **Components**: Modular React components with shadcn/ui and Radix UI
- **WebSocket integration** for real-time updates (Socket.IO)
- **TypeScript** throughout with strict typing
- **Tailwind CSS** for styling with animations

### Key Design Patterns
- **Singleton Services**: Redis, WhatsApp connection, and message handler use singleton pattern
- **Event-Driven Architecture**: WhatsApp events trigger message processing pipeline
- **3-Layer Memory System**: Intelligent memory management with AI-powered optimization
- **Graceful Shutdown**: Comprehensive cleanup on SIGINT/SIGTERM
- **Health Checks**: All services implement healthCheck() methods
- **Error Boundaries**: Express error handlers and service-level error handling
- **JWT Authentication**: Secure API access with token-based authentication
- **Email Verification**: Gmail SMTP integration for user verification

## Configuration Management

### Environment Variables
All configuration is managed through `src/config/env.ts` with Zod validation:

**Required Variables:**
- `OPENAI_API_KEY`: DeepSeek/OpenAI API key
- Redis connection details (host, port, optional password)

**Optional but Recommended:**
- `GROQ_API_KEY`: For free audio transcription (Whisper Large-v3)
- `OPENAI_BASE_URL`: For DeepSeek API endpoint
- Email configuration for verification system
- JWT secrets for authentication

### API Integration Priorities
1. **Groq Whisper Large-v3**: Free audio transcription (3x faster than OpenAI)
2. **GPT-4o-mini Vision**: Cost-effective image analysis (60% cheaper)
3. **DeepSeek Chat**: Primary text generation model
4. **Gmail SMTP**: Email verification and notifications

## Key Features

### Message Processing Pipeline
1. **Webhook Reception**: Messages received via Baileys WebSocket
2. **Authentication Check**: User authentication and authorization
3. **Subscription Verification**: Check user plan and quotas
4. **Command Detection**: Built-in commands (RESET, PAUSE, RESUME, PDF, STATUS, HELP, UPGRADE, USAGE, PLAN)
5. **Quota Validation**: Verify daily/monthly limits before processing
6. **Media Handling**: Separate download and processing for audio/images
7. **AI Processing**: Context-aware responses with Redis-cached conversation history
8. **Usage Tracking**: Real-time usage increment after successful operations
9. **Intelligent Memory**: 3-layer memory system with automatic optimization
10. **Personalization**: User-specific conversation customization
11. **Rate Limiting**: Per-user rate limiting (10 messages/minute default)
12. **Response Delivery**: Async message sending with error handling

### Subscription System
- **Plan Management**: Create, update, delete subscription plans with flexible pricing
- **Quota Management**: Daily, monthly, and per-feature usage limits
- **Real-time Tracking**: Live usage monitoring and quota enforcement
- **Automatic Resets**: Daily and monthly quota resets at appropriate intervals
- **Graceful Degradation**: Clear messaging when limits are exceeded
- **Upgrade Prompts**: Built-in commands to view and upgrade plans

### Supported Message Types
- **Text**: Direct AI processing with context and personalization
- **Audio**: Groq Whisper transcription → AI response
- **Images**: GPT-4o-mini Vision analysis → AI response
- **Commands**: System control commands for bot management

### Authentication & Authorization
- **JWT-based Authentication**: Secure token system
- **Email Verification**: Gmail SMTP integration
- **Role-based Access**: Admin and user roles
- **Password Security**: bcryptjs hashing
- **Session Management**: Token expiration and refresh

### Memory Management
- **Layer 1**: Short-term memory (immediate context)
- **Layer 2**: Medium-term memory (session-based context)
- **Layer 3**: Long-term memory (persistent user data)
- **AI Optimization**: Automatic memory pruning and relevance scoring
- **Redis Caching**: Distributed memory storage

### Caching Strategy
- **Context Storage**: User conversation history (3600s TTL)
- **Pause States**: Temporary bot pause per user (3600s TTL)
- **User States**: Extended user data (7200s TTL)
- **Authentication Cache**: JWT tokens and user sessions
- **Redis Fallback**: In-memory cache when Redis unavailable

## API Endpoints

### Health and Status
- `GET /health`: Service health status
- `GET /status`: Detailed system information
- `GET /api/qr`: QR code for WhatsApp connection
- `GET /api/bot-status`: Bot connection status

### Authentication
- `POST /api/auth/register`: User registration with email verification
- `POST /api/auth/login`: User login with JWT token
- `POST /api/auth/verify-email`: Email verification
- `POST /api/auth/forgot-password`: Password reset request
- `POST /api/auth/reset-password`: Password reset confirmation

### Subscription and Plans
- `GET /api/subscription/plans`: Get all available plans (public)
- `GET /api/subscription/plans/:planId`: Get specific plan details (public)
- `GET /api/subscription/current`: Get user's current subscription (protected)
- `GET /api/subscription/usage`: Get detailed usage statistics (protected)
- `POST /api/subscription/subscribe`: Subscribe to a plan (protected)
- `GET /api/subscription/quota/:feature`: Check quota for specific feature (protected)
- `GET /api/subscription/features/:featureName`: Check feature access (protected)

### Subscription Admin Routes (Protected)
- `POST /api/subscription/admin/plans`: Create new plan (admin only)
- `PUT /api/subscription/admin/plans/:planId`: Update plan (admin only)
- `DELETE /api/subscription/admin/plans/:planId`: Delete plan (admin only)
- `GET /api/subscription/admin/subscriptions`: Get all subscriptions (admin only)
- `GET /api/subscription/admin/users/:userId/subscriptions`: Get user subscriptions (admin only)
- `GET /api/subscription/admin/health`: Subscription service health check (admin only)

### Message Management (Now with Quota Protection)
- `POST /send-message`: Send manual messages (requires auth + message quota)
- `POST /users/:userId/pause`: Pause user
- `POST /users/:userId/resume`: Resume user
- `DELETE /users/:userId/context`: Clear user context
- `GET /api/conversations`: Get all conversations
- `GET /api/conversations/:userId/messages`: Get user messages

### Bot Control
- `POST /api/bot/pause`: Pause bot globally
- `POST /api/bot/resume`: Resume bot globally
- `POST /api/disconnect`: Disconnect WhatsApp

### Admin Routes (Protected)
- `GET /api/admin/stats`: System statistics
- `POST /api/admin/config`: Update bot configuration
- `GET /api/admin/users`: List all users
- `DELETE /api/admin/users/:id`: Delete user

### User Routes (Protected)
- `GET /api/user/profile`: Get user profile
- `PUT /api/user/profile`: Update user profile
- `GET /api/user/preferences`: Get personalization settings
- `PUT /api/user/preferences`: Update personalization settings

## Testing Strategy

### Test Structure
- **Unit Tests**: Service-level testing with Jest
- **Integration Tests**: Redis, API endpoint, and authentication testing
- **Coverage Requirements**: 70% threshold for branches, functions, lines
- **Test Environment**: Isolated Node.js environment with mocks
- **Setup**: Automated test database setup and teardown

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
```

### Test Configuration
- **Jest preset**: ts-jest for TypeScript support
- **Test timeout**: 30 seconds
- **Coverage reports**: text, lcov, html formats
- **Mock support**: Clear and restore mocks between tests

## Development Workflow

### Adding New Features
1. **Define Types**: Add TypeScript interfaces in `src/types/`
2. **Implement Service**: Create service in appropriate `src/services/` subdirectory
3. **Add Authentication**: If needed, protect with JWT middleware
4. **Update Handlers**: Modify `messageHandler.ts` if processing new message types
5. **Create Routes**: Add API endpoints in `src/routes/`
6. **Add Tests**: Create corresponding test files in `tests/`
7. **Update Configuration**: Add any new environment variables to `env.ts`
8. **Frontend Integration**: Update dashboard components if needed

### Security Considerations
- **Input Validation**: Zod schemas for all configuration and external data
- **JWT Authentication**: Secure token-based access control
- **Password Hashing**: bcryptjs for secure password storage
- **Rate Limiting**: Implemented per-user to prevent spam
- **Sanitization**: All user inputs sanitized before processing
- **Secret Management**: Environment variables for all sensitive data
- **CORS**: Configured for frontend access
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

### Performance Optimizations
- **Async Processing**: Non-blocking message processing
- **Connection Pooling**: Redis connection reuse
- **Media Streaming**: File-based media handling to prevent memory issues
- **Context Limits**: Maximum 10 messages per user context
- **Timeout Management**: Configurable timeouts for all external calls
- **Intelligent Caching**: 3-layer memory system with AI optimization
- **Background Jobs**: Bull queue for heavy processing tasks

## Common Issues and Solutions

### WhatsApp Connection
- **QR Code Issues**: Delete `sessions/` directory and restart
- **Connection Drops**: Automatic reconnection with exponential backoff
- **Authentication Failures**: Check WhatsApp account status

### Redis Connection
- **Connection Failures**: Falls back to in-memory cache
- **Memory Issues**: Configurable TTL values for cache cleanup
- **Persistence**: Data survives Redis restarts with AOF

### API Rate Limits
- **OpenAI Limits**: Automatic retry with exponential backoff
- **Groq Integration**: Free tier with generous limits for Whisper
- **Rate Limiting**: Per-user controls prevent abuse

### File Handling
- **Large Media Files**: Size limits enforced (16MB audio, 5MB images)
- **Temp File Cleanup**: Automatic cleanup on graceful shutdown
- **Upload Security**: File type and size validation

### Authentication Issues
- **JWT Expiration**: Implement token refresh mechanism
- **Email Delivery**: Check Gmail SMTP configuration
- **Password Reset**: Verify email templates and links

## Frontend Dashboard

The Next.js dashboard (`frontend/`) provides:
- **Real-time Status**: WebSocket connection for live updates
- **QR Code Display**: Visual QR code for easy WhatsApp connection
- **Conversation Monitoring**: Chat history and user interaction tracking
- **System Health**: Service status and performance metrics
- **User Management**: Admin panel for user administration
- **Configuration**: Dynamic bot settings management
- **Analytics**: Conversation and usage statistics

### Frontend Development
```bash
cd frontend
npm run dev     # Development server on port 3001
npm run build   # Production build
npm start       # Production server
npm run lint    # ESLint checking
npm run type-check  # TypeScript validation
```

### Frontend Architecture
- **Next.js 14**: App router with TypeScript
- **shadcn/ui**: Reusable UI components
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Socket.IO**: Real-time communication
- **React Hooks**: Custom hooks for API and WebSocket

## Monitoring and Logs

### Structured Logging
- **Pino Logger**: High-performance JSON logging
- **Log Levels**: Configurable via LOG_LEVEL environment variable
- **Log Rotation**: Automatic log file rotation with size limits
- **Context Logging**: Request correlation and metadata inclusion
- **Error Tracking**: Comprehensive error logging with stack traces

### Health Monitoring
- **Service Health Checks**: Individual service status monitoring
- **Memory Usage**: Process memory tracking
- **Uptime Metrics**: System availability monitoring
- **Connection Status**: Real-time WhatsApp and Redis connection status
- **API Metrics**: Request/response times and error rates

### Email Integration
- **Gmail SMTP**: Configured for email verification and notifications
- **Email Templates**: HTML templates for various email types
- **Delivery Tracking**: Email sending status and error handling
- **Queue Management**: Background email processing

## Personalization System

### User Preferences
- **Conversation Style**: Customizable AI personality
- **Language Settings**: Multi-language support capability
- **Response Length**: User preference for response verbosity
- **Topic Interests**: AI learns user preferences over time
- **Context Awareness**: Personalized context management

### AI Memory Integration
- **User Profiles**: Persistent user data across sessions
- **Conversation History**: Intelligent context preservation
- **Learning System**: AI adapts to user communication patterns
- **Privacy Controls**: User control over data retention

## Admin Configuration System

### Dynamic Configuration
- **Runtime Updates**: Change bot behavior without restart
- **Feature Toggles**: Enable/disable features per user or globally
- **AI Model Selection**: Switch between different AI models
- **Rate Limit Adjustment**: Dynamic rate limiting configuration
- **Cache Settings**: Configurable TTL and memory limits

### Statistics and Analytics
- **Usage Metrics**: Message counts, user activity, response times
- **Error Tracking**: Comprehensive error reporting and trends
- **Performance Monitoring**: System resource usage and bottlenecks
- **User Analytics**: User engagement and retention metrics

## Docker Deployment

### Docker Configuration
- **Multi-stage Build**: Optimized production image
- **Redis Container**: Persistent data storage
- **Health Checks**: Container health monitoring
- **Volume Mounts**: Persistent sessions and logs
- **Environment Variables**: Secure configuration management

### Docker Compose Services
- **zecabot**: Main application container
- **redis**: Cache and persistence layer
- **redis-commander**: Redis management UI (debug profile)

## Security Best Practices

### Data Protection
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Access Control**: Role-based permissions system
- **Audit Logging**: Comprehensive activity tracking
- **Data Retention**: Configurable data cleanup policies
- **Privacy Compliance**: User data protection and deletion rights

### API Security
- **Authentication**: JWT-based secure API access
- **Authorization**: Role-based endpoint protection
- **Input Validation**: Comprehensive data validation with Zod
- **Rate Limiting**: API abuse prevention
- **CORS Policy**: Controlled cross-origin access