#!/bin/bash

# WhatsApp Bot Setup Script
echo "🤖 WhatsApp AI Bot Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p sessions
mkdir -p logs
mkdir -p uploads
mkdir -p temp

echo -e "${GREEN}✅ Directories created${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found, copying from .env.example${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env file with your API keys before running the bot${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Check if Redis is available
echo -e "${BLUE}🔍 Checking Redis connection...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis is installed but not running${NC}"
        echo -e "${BLUE}💡 Start Redis with: redis-server${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Redis not found. Install options:${NC}"
    echo -e "${BLUE}   • Docker: docker-compose up -d redis${NC}"
    echo -e "${BLUE}   • Ubuntu/Debian: sudo apt install redis-server${NC}"
    echo -e "${BLUE}   • macOS: brew install redis${NC}"
fi

# Build TypeScript
echo -e "${BLUE}🏗️  Building TypeScript...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Show setup completion
echo -e "\n${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Edit .env file with your API keys:"
echo -e "   ${YELLOW}• OPENAI_API_KEY=sk-your-key${NC}"
echo -e "   ${YELLOW}• GROQ_API_KEY=gsk_your-key${NC}"
echo -e "2. Start Redis if not running"
echo -e "3. Run the bot:"
echo -e "   ${YELLOW}npm run dev${NC} (development)"
echo -e "   ${YELLOW}npm start${NC} (production)"

echo -e "\n${BLUE}API Key Setup:${NC}"
echo -e "• OpenAI: https://platform.openai.com/api-keys"
echo -e "• Groq (free): https://console.groq.com/keys"

echo -e "\n${BLUE}Helpful commands:${NC}"
echo -e "• Health check: curl http://localhost:3000/health"
echo -e "• Status: curl http://localhost:3000/status"
echo -e "• Logs: tail -f logs/bot.log"

echo -e "\n${GREEN}Happy coding! 🚀${NC}"