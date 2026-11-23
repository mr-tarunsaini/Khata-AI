import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import {
  handleHealthCheck,
  handleGnaniSTT,
  handleGnaniTTS,
  handleGeminiIntent,
  handleSyncOfflineQueue
} from './server/voiceGateway.ts'

function voiceGatewayPlugin(): Plugin {
  const attachMiddleware = (server: { middlewares: any }) => {
    server.middlewares.use((req: any, res: any, next: any) => {
      const rawUrl = req.url || ''
      const url = rawUrl.split('?')[0] || ''
      if (!url.startsWith('/api/voice')) {
        return next()
      }

      // Safe CORS headers for all voice API requests
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-language, Authorization')

      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-language, Authorization'
        })
        res.end()
        return
      }

      if (url === '/api/voice/health') {
        return handleHealthCheck(res)
      }

      const chunks: Buffer[] = []
      req.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)))
      req.on('error', (err: any) => {
        console.warn('Voice gateway stream error:', err?.message)
        if (!res.headersSent) {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ error: err?.message || 'Stream error', fallback: true }))
        }
      })
      req.on('end', async () => {
        try {
          const bodyBuffer = Buffer.concat(chunks)
          const bodyText = bodyBuffer.toString('utf-8')

          if (url.startsWith('/api/voice/stt/stream')) {
            return await handleGnaniSTT(req, res, bodyBuffer)
          }
          if (url.startsWith('/api/voice/tts/synthesize')) {
            return await handleGnaniTTS(req, res, bodyText)
          }
          if (url.startsWith('/api/voice/intent')) {
            return await handleGeminiIntent(req, res, bodyText)
          }
          if (url.startsWith('/api/voice/sync')) {
            return await handleSyncOfflineQueue(req, res, bodyText)
          }

          if (!res.headersSent) {
            res.writeHead(404, { 'Access-Control-Allow-Origin': '*' })
            res.end()
          }
        } catch (innerErr: any) {
          console.error('Voice gateway request handling error:', innerErr)
          if (!res.headersSent) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify({ error: innerErr?.message || 'Gateway error', fallback: true }))
          }
        }
      })
    })
  }

  return {
    name: 'voice-gateway-plugin',
    configureServer: attachMiddleware,
    configurePreviewServer: attachMiddleware
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
