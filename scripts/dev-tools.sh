#!/bin/bash

# Development Tools Script
echo "🛠️ WhatsApp Bot Development Tools"
echo "=================================="

case "$1" in
    "health")
        echo "🔍 Checking bot health..."
        curl -s http://localhost:3000/health | jq '.' || echo "Bot is not running or jq is not installed"
        ;;
    "status")
        echo "📊 Getting bot status..."
        curl -s http://localhost:3000/status | jq '.' || echo "Bot is not running or jq is not installed"
        ;;
    "logs")
        echo "📋 Showing bot logs (press Ctrl+C to exit)..."
        if [ -f "logs/bot.log" ]; then
            tail -f logs/bot.log
        else
            echo "Log file not found. Make sure the bot is running."
        fi
        ;;
    "redis")
        echo "🔍 Checking Redis..."
        if command -v redis-cli &> /dev/null; then
            echo "Redis status:"
            redis-cli ping
            echo "Redis info:"
            redis-cli info server | grep -E "(redis_version|uptime_in_seconds)"
        else
            echo "redis-cli not found"
        fi
        ;;
    "clean")
        echo "🧹 Cleaning up temporary files..."
        rm -rf dist/
        rm -rf logs/*.log
        rm -rf temp/*
        echo "✅ Cleanup completed"
        ;;
    "test-send")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 test-send <phone_number> <message>"
            echo "Example: $0 test-send 5511999999999@s.whatsapp.net 'Hello World'"
        else
            echo "📤 Sending test message..."
            curl -X POST http://localhost:3000/send-message \
                -H "Content-Type: application/json" \
                -d "{\"to\":\"$2\",\"message\":\"$3\"}"
            echo ""
        fi
        ;;
    "pause-user")
        if [ -z "$2" ]; then
            echo "Usage: $0 pause-user <phone_number> [duration_ms]"
            echo "Example: $0 pause-user 5511999999999@s.whatsapp.net 300000"
        else
            duration=${3:-3600000}  # Default 1 hour
            echo "⏸️ Pausing user $2 for ${duration}ms..."
            curl -X POST http://localhost:3000/users/$2/pause \
                -H "Content-Type: application/json" \
                -d "{\"duration\":$duration}"
            echo ""
        fi
        ;;
    "resume-user")
        if [ -z "$2" ]; then
            echo "Usage: $0 resume-user <phone_number>"
            echo "Example: $0 resume-user 5511999999999@s.whatsapp.net"
        else
            echo "▶️ Resuming user $2..."
            curl -X POST http://localhost:3000/users/$2/resume
            echo ""
        fi
        ;;
    "clear-context")
        if [ -z "$2" ]; then
            echo "Usage: $0 clear-context <phone_number>"
            echo "Example: $0 clear-context 5511999999999@s.whatsapp.net"
        else
            echo "🗑️ Clearing context for user $2..."
            curl -X DELETE http://localhost:3000/users/$2/context
            echo ""
        fi
        ;;
    "monitor")
        echo "📈 Starting monitoring mode (press Ctrl+C to exit)..."
        echo "Monitoring health every 30 seconds..."
        while true; do
            echo "$(date): Health check..."
            curl -s http://localhost:3000/health | jq '.status' 2>/dev/null || echo "ERROR: Bot not responding"
            sleep 30
        done
        ;;
    "env-check")
        echo "🔍 Checking environment configuration..."
        
        # Check required env vars
        echo "Environment variables:"
        if [ -f ".env" ]; then
            echo "✅ .env file found"
            
            # Check OpenAI key
            if grep -q "OPENAI_API_KEY=sk-" .env; then
                echo "✅ OpenAI API key configured"
            else
                echo "❌ OpenAI API key missing or invalid format"
            fi
            
            # Check Groq key
            if grep -q "GROQ_API_KEY=gsk_" .env; then
                echo "✅ Groq API key configured"
            else
                echo "❌ Groq API key missing or invalid format"
            fi
            
            # Check Redis config
            if grep -q "REDIS_HOST=" .env; then
                echo "✅ Redis host configured"
            else
                echo "❌ Redis host not configured"
            fi
        else
            echo "❌ .env file not found"
        fi
        
        # Check directories
        echo -e "\nDirectories:"
        for dir in "sessions" "logs" "uploads" "temp"; do
            if [ -d "$dir" ]; then
                echo "✅ $dir/ directory exists"
            else
                echo "❌ $dir/ directory missing"
            fi
        done
        
        # Check build
        echo -e "\nBuild:"
        if [ -d "dist" ]; then
            echo "✅ dist/ directory exists"
        else
            echo "❌ dist/ directory missing - run 'npm run build'"
        fi
        ;;
    "help"|"")
        echo "Available commands:"
        echo "  health         - Check bot health"
        echo "  status         - Get detailed bot status"
        echo "  logs           - Follow bot logs"
        echo "  redis          - Check Redis status"
        echo "  clean          - Clean temporary files"
        echo "  test-send      - Send test message"
        echo "  pause-user     - Pause user conversations"
        echo "  resume-user    - Resume user conversations"
        echo "  clear-context  - Clear user context"
        echo "  monitor        - Monitor bot health"
        echo "  env-check      - Check environment setup"
        echo "  help           - Show this help"
        echo ""
        echo "Examples:"
        echo "  ./scripts/dev-tools.sh health"
        echo "  ./scripts/dev-tools.sh test-send 5511999999999@s.whatsapp.net 'Hello'"
        echo "  ./scripts/dev-tools.sh pause-user 5511999999999@s.whatsapp.net 600000"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        ;;
esac