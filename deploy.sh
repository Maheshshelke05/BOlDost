#!/bin/bash
set -e

DOMAIN="maheshbhau.xyz"
EMAIL="mahesh@maheshbhau.xyz"   # <-- apna email yahan likho SSL alerts ke liye

echo "🚀 BolDost Deploy Starting..."

# ─── 1. Docker & Docker Compose Install (agar nahi hai) ───────────────────────
if ! command -v docker &>/dev/null; then
  echo "📦 Docker install ho raha hai..."
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker $USER
  echo "✅ Docker installed"
fi

if ! command -v docker compose &>/dev/null; then
  sudo apt-get install -y docker-compose-plugin
fi

# ─── 2. .env file check ───────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "❌ .env file nahi mili! Pehle .env file upload karo:"
  echo "   scp -i key.pem .env ubuntu@EC2_IP:~/boldost/"
  exit 1
fi

set -a; source .env; set +a

# ─── 3. App Build ─────────────────────────────────────────────────────────────
echo "🔨 App build ho raha hai..."
docker build \
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

# ─── 4. SSL Certificate (Let's Encrypt) ──────────────────────────────────────
mkdir -p ./certbot/conf ./certbot/www

if [ ! -f "./certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
  echo "🔐 SSL certificate le raha hai..."

  # Pehle sirf HTTP pe start karo (certbot challenge ke liye)
  # Temporary nginx config - sirf port 80
  cat > /tmp/nginx-temp.conf << 'EOF'
server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

  docker stop boldost 2>/dev/null || true
  docker rm boldost 2>/dev/null || true

  docker run -d --name boldost-temp \
    -p 80:80 \
    -v $(pwd)/certbot/www:/var/www/certbot \
    -v /tmp/nginx-temp.conf:/etc/nginx/conf.d/default.conf \
    nginx:alpine

  sleep 3

  # Certbot se SSL lo
  docker run --rm \
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

  docker stop boldost-temp && docker rm boldost-temp
  echo "✅ SSL certificate mila!"
else
  echo "✅ SSL certificate already hai, renew check karta hai..."
  docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot renew --quiet
fi

# ─── 5. App Start with HTTPS ──────────────────────────────────────────────────
echo "🌐 App start ho raha hai HTTPS ke saath..."

docker stop boldost 2>/dev/null || true
docker rm boldost 2>/dev/null || true

docker run -d \
  --name boldost \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf \
  boldost-app

# ─── 6. Auto SSL Renew (cron) ─────────────────────────────────────────────────
CRON_JOB="0 3 * * * cd $(pwd) && docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt -v $(pwd)/certbot/www:/var/www/certbot certbot/certbot renew --quiet && docker exec boldost nginx -s reload"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_JOB") | crontab -

echo ""
echo "✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 BolDost is LIVE at: https://$DOMAIN"
echo "🔒 HTTPS enabled with auto-renewal"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
