import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

function voiceGatewayPlugin(): Plugin {
  return {
    name: 'voice-gateway-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/voice')) {
          return next()
        }

        try {
          const { handleHealthCheck, handleGnaniSTT, handleGnaniTTS, handleGeminiIntent, handleSyncOfflineQueue } = await import('./server/voiceGateway.ts')

          if (req.url === '/api/voice/health') {
            return handleHealthCheck(res)
          }

          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
          req.on('end', async () => {
            const bodyBuffer = Buffer.concat(chunks)
            const bodyText = bodyBuffer.toString('utf-8')

            if (req.url?.startsWith('/api/voice/stt/stream')) {
              return handleGnaniSTT(req, res, bodyBuffer)
            }
            if (req.url?.startsWith('/api/voice/tts/synthesize')) {
              return handleGnaniTTS(req, res, bodyText)
            }
            if (req.url?.startsWith('/api/voice/intent')) {
              return handleGeminiIntent(req, res, bodyText)
            }
            if (req.url?.startsWith('/api/voice/sync')) {
              return handleSyncOfflineQueue(req, res, bodyText)
            }

            res.writeHead(404)
            res.end()
          })
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      tailwindcss(),
      voiceGatewayPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'KhataAI – Voice-Powered Digital Khata',
        short_name: 'KhataAI',
        description: 'Bolo. Likho. Hisaab Jaano. Voice-first digital ledger for Kirana stores.',
        theme_color: '#253B73',
        background_color: '#F8F7F2',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
  }
})
