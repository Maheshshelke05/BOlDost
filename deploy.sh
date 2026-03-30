#!/bin/bash
# EC2 pe run karo: bash deploy.sh
# Pehle .env file EC2 pe upload karo

set -a
source .env
set +a

docker build \
  --build-arg GEMINI_API_KEY=$GEMINI_API_KEY \
  --build-arg OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  --build-arg GROQ_API_KEY=$GROQ_API_KEY \
  --build-arg FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID \
  --build-arg FIREBASE_APP_ID=$FIREBASE_APP_ID \
  --build-arg FIREBASE_API_KEY=$FIREBASE_API_KEY \
  --build-arg FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN \
  --build-arg FIREBASE_FIRESTORE_DATABASE_ID=$FIREBASE_FIRESTORE_DATABASE_ID \
  --build-arg FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET \
  --build-arg FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID \
  --build-arg APP_URL=$APP_URL \
  -t boldost-app .

docker stop boldost 2>/dev/null || true
docker rm boldost 2>/dev/null || true
docker run -d --name boldost -p 80:80 --restart unless-stopped boldost-app

echo "✅ BolDost deployed at http://$(curl -s ifconfig.me)"
