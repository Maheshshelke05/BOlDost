# BolDost - AI English Tutor

AI-powered English learning companion with live voice practice, chat tutor, and community features.

## Features

- 🎤 **Live Voice Practice** - Real-time AI conversation with Gemini Live
- 💬 **AI Chat Tutor** - Grammar correction, translation, interview prep
- 👥 **Community Mode** - Practice with other learners via WebRTC
- 📊 **Progress Tracking** - XP, streaks, and detailed feedback
- 🔒 **Secure** - Firebase Auth + Firestore with proper security rules

## Tech Stack

- React + TypeScript + Vite
- Firebase (Auth + Firestore)
- Gemini AI (Live + Chat)
- WebRTC for peer calls
- Docker + Nginx for deployment

---

## Local Development

```bash
# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Add your API keys to .env
nano .env

# Run dev server
npm run dev
```

Open http://localhost:3000

---

## Production Deployment (EC2 + Docker)

### Prerequisites
- AWS EC2 instance (t2.micro or better)
- Domain name pointed to EC2 IP
- Security Group: ports 22, 80, 443 open

### Step 1: Setup Domain DNS
Point your domain A records to EC2 public IP:
```
A Record:  maheshbhau.xyz      → EC2_PUBLIC_IP
A Record:  www.maheshbhau.xyz  → EC2_PUBLIC_IP
```

### Step 2: Clone & Configure
```bash
# SSH to EC2
ssh -i key.pem ec2-user@EC2_IP

# Clone repo
git clone https://github.com/your-repo/boldost.git
cd boldost

# Upload .env file (from local machine)
# scp -i key.pem .env ec2-user@EC2_IP:~/boldost/

# Edit deploy.sh - update EMAIL and DOMAIN
nano deploy.sh
```

### Step 3: Deploy (One Command!)
```bash
bash deploy.sh
```

This will:
- Install Docker
- Build the app
- Get free SSL certificate (Let's Encrypt)
- Start app on HTTPS
- Setup auto-renewal cron

Your app will be live at: **https://maheshbhau.xyz** 🎉

---

## Environment Variables

See `.env.example` for all required variables:

- `GEMINI_API_KEY` - Google AI Studio
- `OPENROUTER_API_KEY` - OpenRouter (fallback)
- `GROQ_API_KEY` - Groq (fallback)
- `FIREBASE_*` - Firebase project config

---

## Security Notes

- Never commit `.env` or `firebase-applet-config.json` to GitHub
- API keys are injected at build time (not exposed to browser)
- Firestore rules enforce user-level access control
- SSL auto-renews every 3 months

---

## License

MIT
