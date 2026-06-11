#!/bin/bash
# PesaPilot — Hostinger VPS initial setup script
# Run once as root: bash scripts/setup-vps.sh

set -e

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

echo "==> Installing PM2..."
npm install -g pm2

echo "==> Installing app dependencies and building..."
npm install
npm run build

echo "==> Starting app with PM2..."
pm2 start npm --name pesapilot -- start
pm2 save
pm2 startup

echo "==> Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/pesapilot
sudo ln -sf /etc/nginx/sites-available/pesapilot /etc/nginx/sites-enabled/pesapilot
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "✅ Setup complete! Edit /etc/nginx/sites-available/pesapilot to set your domain name."
echo "   Then run: sudo certbot --nginx -d yourdomain.com"
