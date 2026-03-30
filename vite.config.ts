import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function aiProxyPlugin(env: Record<string, string>) {
  return {
    name: 'boldost-ai-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/ai/:action', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const action = req.url?.split('/').filter(Boolean).pop();
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk);

        let body: any = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
        const openRouterKey = env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY;
        const groqKey = env.GROQ_API_KEY || env.VITE_GROQ_API_KEY;

        const json = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        };

        try {
          if (action === 'key') {
            if (!geminiKey) {
              json(400, { error: 'Gemini key not configured' });
              return;
            }
            json(200, { key: geminiKey });
            return;
          }

          if (action === 'chat') {
            const providers = [
              async () => {
                if (!geminiKey) throw new Error('Gemini key missing');
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body.geminiPayload),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error?.message || 'Gemini failed');
                return data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join(' ') || '';
              },
              async () => {
                if (!openRouterKey) throw new Error('OpenRouter key missing');
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': body.origin || 'http://localhost:3000',
                    'X-Title': 'BolDost',
                  },
                  body: JSON.stringify(body.openRouterPayload),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error?.message || 'OpenRouter failed');
                return data?.choices?.[0]?.message?.content || '';
              },
              async () => {
                if (!groqKey) throw new Error('Groq key missing');
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${groqKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(body.groqPayload),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error?.message || 'Groq failed');
                return data?.choices?.[0]?.message?.content || '';
              },
            ];

            const errors: string[] = [];
            for (const provider of providers) {
              try {
                const text = await provider();
                json(200, { text });
                return;
              } catch (error) {
                errors.push(error instanceof Error ? error.message : String(error));
              }
            }

            json(502, { error: 'All AI providers failed', details: errors });
            return;
          }

          if (action === 'analyze' || action === 'translate') {
            if (!geminiKey) {
              json(400, { error: 'Gemini key missing for structured response' });
              return;
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body.payload),
            });
            const data = await response.json();
            if (!response.ok) {
              json(response.status, { error: data?.error?.message || 'Gemini structured request failed' });
              return;
            }

            json(200, { text: data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join(' ') || '' });
            return;
          }

          json(404, { error: 'Unknown AI action' });
        } catch (error) {
          json(500, { error: error instanceof Error ? error.message : 'Proxy failed' });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      aiProxyPlugin(env),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icons/*.png'],
        manifest: {
          name: 'BolDost - AI English Tutor',
          short_name: 'BolDost',
          description: 'Your AI-powered English learning companion',
          theme_color: '#6C63FF',
          background_color: '#F8F7FF',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
            },
          ],
        },
      }),
    ],
    define: {
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID': JSON.stringify(env.FIREBASE_FIRESTORE_DATABASE_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_GEMINI_API_KEY_LIVE': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
