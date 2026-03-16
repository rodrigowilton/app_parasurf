#!/bin/bash
# =============================================
# Deploy — Instituto ParaSurf
# =============================================
set -e

echo "🏄 Deploy Instituto ParaSurf..."

# 1. Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 2. Build de produção
echo "🔨 Gerando build..."
npm run build

# 3. Copiar para destino
echo "📁 Copiando arquivos..."
sudo mkdir -p /var/www/parasurf
sudo cp -r dist /var/www/parasurf/
sudo cp package.json /var/www/parasurf/
cd /var/www/parasurf && sudo npm install --production

# 4. Criar diretório de logs PM2
sudo mkdir -p /var/log/pm2

# 5. Copiar config Nginx
echo "⚙️  Configurando Nginx..."
sudo cp nginx/parasurf.conf /etc/nginx/sites-available/parasurf
sudo ln -sf /etc/nginx/sites-available/parasurf /etc/nginx/sites-enabled/parasurf
sudo nginx -t && sudo systemctl reload nginx

# 6. Iniciar/reiniciar com PM2
echo "🚀 Iniciando PM2..."
cd /var/www/parasurf
pm2 delete instituto-parasurf 2>/dev/null || true
pm2 start /home/$USER/parasurf/pm2/ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "✅ Deploy concluído!"
echo "🌐 App rodando em http://localhost:3015"
echo "📞 Suporte: +55 27 98866-8868"
