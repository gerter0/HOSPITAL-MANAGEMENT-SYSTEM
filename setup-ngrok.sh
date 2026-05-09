#!/bin/bash
# NGrok Setup for Hospital Management System on Mobile

# Step 1: Start ngrok tunnel
echo "🚀 Starting ngrok tunnel..."
ngrok http 5001 --domain=<your-ngrok-domain> # Replace with your ngrok domain

# Step 2: Copy the ngrok URL (will look like: https://xxxx-xx-xxxx-xxx.ngrok-free.app)
# 
# Step 3: Set environment variables
export NGROK_URL="https://your-ngrok-url.ngrok-free.app"

# Step 4: Start backend with ngrok awareness
echo "✅ NGrok tunnel started"
echo "📱 Access from mobile: ${NGROK_URL}"
echo "🔧 Configure frontend VITE_API_URL=${NGROK_URL}/api/v1"
