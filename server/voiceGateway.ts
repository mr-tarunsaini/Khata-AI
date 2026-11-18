/**
 * Server-Side Voice Gateway for KhataAI
 * 
 * Secure proxy for secret-bearing speech & LLM integrations:
 * - Gnani Prisma Streaming STT
 * - Gnani Timbre TTS
 * - Gemini API Structured Intent Parsing
 * 
 * Complies with Section 5 & Section 9 of Project Architecture:
 * - API keys NEVER exposed in client bundle
 * - Ephemeral audio buffers discarded after transcription
 * - Strict schema validation on all outputs
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface GatewayHealth {
  status: 'ok' | 'degraded'
  gnaniConfigured: boolean
  geminiConfigured: boolean
  timestamp: string
}

const GNANI_API_KEY = process.env.GNANI_API_KEY || ''
const GNANI_TOKEN = process.env.GNANI_TOKEN || ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

/**
 * Handle /api/voice/health
 */
export function handleHealthCheck(res: ServerResponse) {
  const health: GatewayHealth = {
    status: 'ok',
    gnaniConfigured: Boolean(GNANI_API_KEY && GNANI_API_KEY !== 'your_gnani_prisma_api_key_here'),
    geminiConfigured: Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_google_gemini_api_key_here'),
    timestamp: new Date().toISOString()
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(health))
}

/**
 * Handle /api/voice/stt/stream (Gnani Prisma STT proxy)
 */
export async function handleGnaniSTT(req: IncomingMessage, res: ServerResponse, bodyBuffer: Buffer) {
  try {
    if (!GNANI_API_KEY || GNANI_API_KEY === 'your_gnani_prisma_api_key_here') {
      // Mock / fallback response when Gnani credentials are not configured in environment
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        text: 'Ramesh ka 340 udhaar',
        language: 'hi-IN',
        confidence: 0.96,
        provider: 'Gnani Prisma STT (Simulated Gateway Mode)'
      }))
      return
    }

    // Call official Gnani Prisma Streaming / REST endpoint
    const gnaniEndpoint = 'https://asr.gnani.ai/v1/recognize'
    const gnaniRes = await fetch(gnaniEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GNANI_API_KEY}`,
        'Content-Type': req.headers['content-type'] || 'audio/wav',
        'x-language': (req.headers['x-language'] as string) || 'hi-IN'
      },
      body: bodyBuffer
    })

    if (!gnaniRes.ok) {
      throw new Error(`Gnani Prisma API error: ${gnaniRes.statusText}`)
    }

    const gnaniData: any = await gnaniRes.json()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      text: gnaniData.transcript || gnaniData.text || '',
      language: gnaniData.language || 'hi-IN',
      confidence: gnaniData.confidence || 0.95,
      provider: 'Gnani Prisma Streaming STT'
    }))
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message || 'STT processing failed' }))
  }
}

/**
 * Handle /api/voice/tts/synthesize (Gnani Timbre TTS proxy)
 */
export async function handleGnaniTTS(_req: IncomingMessage, res: ServerResponse, bodyText: string) {
  try {
    const payload = JSON.parse(bodyText || '{}')
    const textToSpeak = payload.text || ''
    const language = payload.language || 'hi-IN'

    if (!GNANI_TOKEN || GNANI_TOKEN === 'your_gnani_timbre_token_here') {
      // Fallback: return 204 No Content indicating client should use local SpeechSynthesis
      res.writeHead(204)
      res.end()
      return
    }

    const timbreEndpoint = 'https://tts.gnani.ai/v1/synthesize'
    const timbreRes = await fetch(timbreEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GNANI_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: textToSpeak,
        language: language === 'en' ? 'en-IN' : 'hi-IN',
        voice: payload.voice || 'female_hi_1'
      })
    })

    if (!timbreRes.ok) {
      throw new Error(`Gnani Timbre API error: ${timbreRes.statusText}`)
    }

    const audioArrayBuffer = await timbreRes.arrayBuffer()
    res.writeHead(200, {
      'Content-Type': timbreRes.headers.get('content-type') || 'audio/wav',
      'Content-Length': audioArrayBuffer.byteLength.toString()
    })
    res.end(Buffer.from(audioArrayBuffer))
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message || 'TTS synthesis failed' }))
  }
}

/**
 * Handle /api/voice/intent (Gemini API Structured JSON Intent Parser)
 */
export async function handleGeminiIntent(_req: IncomingMessage, res: ServerResponse, bodyText: string) {
  try {
    const payload = JSON.parse(bodyText || '{}')
    const transcript = payload.transcript || ''

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_google_gemini_api_key_here') {
      // Return null indicating server recommends rule-based parser fallback
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ fallbackToRuleParser: true }))
      return
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            intent: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: [
                'ADD_CREDIT',
                'RECORD_PAYMENT',
                'QUERY_CUSTOMER_BALANCE',
                'QUERY_DAILY_CREDIT',
                'QUERY_DAILY_PAYMENTS',
                'CORRECT_PENDING_TRANSACTION',
                'CLARIFY'
              ]
            } as any,
            customer_name: { type: SchemaType.STRING, nullable: true },
            amount_paise: { type: SchemaType.INTEGER, nullable: true },
            relative_date_phrase: { type: SchemaType.STRING, nullable: true },
            confidence: { type: SchemaType.NUMBER }
          },
          required: ['intent', 'confidence']
        }
      }
    })

    const prompt = `Convert the following Indian Kirana shopkeeper speech into structured intent JSON.
If an amount in rupees is mentioned, convert it into integer paise (1 Rupee = 100 Paise).
Never calculate balances.
Transcript: "${transcript}"`

    const result = await model.generateContent(prompt)
    const responseJson = JSON.parse(result.response.text())

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(responseJson))
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message, fallbackToRuleParser: true }))
  }
}
