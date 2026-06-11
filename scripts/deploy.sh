#!/bin/bash
# PesaPilot — pull latest code and redeploy
# Run on VPS from /var/www/pesapilot: bash scripts/deploy.sh

set -e

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Installing dependencies..."
npm install --omit=dev

echo "==> Building..."
npm run build

echo "==> Restarting app..."
pm2 restart pesapilot

echo "✅ Deployed successfully!"
