#!/bin/bash
set -e

DOMAIN="maheshbhau.xyz"
EMAIL="mahesh@maheshbhau.xyz"   # <-- apna email yahan likho

echo "🚀 BolDost Deploy Starting..."

# ─── 1. Docker Install (agar nahi hai) ────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "📦 Docker install ho raha hai..."
  sudo yum update -y
  sudo yum install -y docker
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker $USER
  echo "✅ Docker installed"
fi

# Docker permission fix - sudo se chalao agar group nahi laga
DOCKER="sudo docker"

# ─── 2. .env file check ───────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "❌ .env file nahi mili!"
  exit 1
fi

set -a; source .env; set +a

# ─── 3. App Build ─────────────────────────────────────────────────────────────
echo "🔨 App build ho raha hai..."
$DOCKER build \
  --build-arg GEMINI_API_KEY="$GEMINI_API_KEY" \
  --build-arg OPENROUTER_API_KEY="$OPENROUTER_API_KEY" \
  --build-arg GROQ_API_KEY="$GROQ_API_KEY" \
  --build-arg FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" \
  --build-arg FIREBASE_APP_ID="$FIREBASE_APP_ID" \
  --build-arg FIREBASE_API_KEY="$FIREBASE_API_KEY" \
  --build-arg FIREBASE_AUTH_DOMAIN="$FIREBASE_AUTH_DOMAIN" \
  --build-arg FIREBASE_FIRESTORE_DATABASE_ID="$FIREBASE_FIRESTORE_DATABASE_ID" \
  --build-arg FIREBASE_STORAGE_BUCKET="$FIREBASE_STORAGE_BUCKET" \
  --build-arg FIREBASE_MESSAGING_SENDER_ID="$FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg APP_URL="https://$DOMAIN" \
  -t boldost-app .
echo "✅ Build complete"

# ─── 4. Certbot folders - permission fix ──────────────────────────────────────
sudo rm -rf ./certbot
mkdir -p ./certbot/conf ./certbot/www
sudo chown -R $USER:$USER ./certbot

# ─── 5. SSL Certificate ───────────────────────────────────────────────────────
if [ ! -f "./certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
  echo "🔐 SSL certificate le raha hai..."

  # Pehle koi container band karo
  $DOCKER stop boldost boldost-temp 2>/dev/null || true
  $DOCKER rm boldost boldost-temp 2>/dev/null || true

  # Port 80 pe simple nginx chalao certbot challenge ke liye
  $DOCKER run -d --name boldost-temp \
    -p 80:80 \
    -v $(pwd)/certbot/www:/var/www/certbot \
    nginx:alpine \
    sh -c 'echo "server { listen 80; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 OK; } }" > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'

  sleep 3

  echo "🌐 Port 80 check kar raha hai..."
  curl -s http://localhost/.well-known/acme-challenge/test || echo "(normal hai agar 404 aaya)"

  # Certbot SSL lo
  $DOCKER run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

  $DOCKER stop boldost-temp && $DOCKER rm boldost-temp
  echo "✅ SSL certificate mila!"

else
  echo "🔄 SSL already hai, renew check..."
  $DOCKER run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot renew --quiet
fi

# ─── 6. App Start with HTTPS ──────────────────────────────────────────────────
echo "🌐 HTTPS pe app start ho raha hai..."

$DOCKER stop boldost 2>/dev/null || true
$DOCKER rm boldost 2>/dev/null || true

$DOCKER run -d \
  --name boldost \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v $(pwd)/certbot/conf:/etc/letsencrypt:ro \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  boldost-app

sleep 2
$DOCKER ps | grep boldost

# ─── 7. Auto SSL Renew cron ───────────────────────────────────────────────────
CRON_JOB="0 3 1 * * cd $(pwd) && sudo docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt -v $(pwd)/certbot/www:/var/www/certbot certbot/certbot renew --quiet && sudo docker exec boldost nginx -s reload"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_JOB") | crontab -

echo ""
echo "✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 BolDost LIVE at: https://$DOMAIN"
echo "🔒 HTTPS with auto-renewal every month"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
