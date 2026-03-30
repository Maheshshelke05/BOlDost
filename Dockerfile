# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# EC2 pe .env file copy karke build karo
# ya --build-arg se pass karo
ARG GEMINI_API_KEY
ARG OPENROUTER_API_KEY
ARG GROQ_API_KEY
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_APP_ID
ARG FIREBASE_API_KEY
ARG FIREBASE_AUTH_DOMAIN
ARG FIREBASE_FIRESTORE_DATABASE_ID
ARG FIREBASE_STORAGE_BUCKET
ARG FIREBASE_MESSAGING_SENDER_ID
ARG APP_URL

# .env file banao build ke liye
RUN echo "GEMINI_API_KEY=$GEMINI_API_KEY" > .env && \
    echo "OPENROUTER_API_KEY=$OPENROUTER_API_KEY" >> .env && \
    echo "GROQ_API_KEY=$GROQ_API_KEY" >> .env && \
    echo "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID" >> .env && \
    echo "FIREBASE_APP_ID=$FIREBASE_APP_ID" >> .env && \
    echo "FIREBASE_API_KEY=$FIREBASE_API_KEY" >> .env && \
    echo "FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN" >> .env && \
    echo "FIREBASE_FIRESTORE_DATABASE_ID=$FIREBASE_FIRESTORE_DATABASE_ID" >> .env && \
    echo "FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET" >> .env && \
    echo "FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID" >> .env && \
    echo "APP_URL=$APP_URL" >> .env

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
