import React from 'react'

interface AudioWaveformProps {
  isListening: boolean
  isProcessing?: boolean
  volume?: number // 0 to 100
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ isListening, isProcessing, volume = 0 }) => {
  if (!isListening && !isProcessing) return null

  // 12 frequency bar multipliers
  const baseHeights = [14, 24, 38, 22, 34, 46, 30, 42, 20, 34, 26, 14]

  return (
    <div className="flex items-center justify-center gap-1.5 h-14 my-3 px-4">
      {baseHeights.map((h, i) => {
        // If live volume is present, scale bar height with volume
        const dynamicHeight = volume > 5
          ? Math.max(8, Math.min(52, Math.round((h * (volume / 50)))))
          : h

        return (
          <span
            key={i}
            className={`w-1.5 rounded-full transition-all duration-150 ${
              isListening
                ? 'bg-[#087F6E]'
                : 'bg-[#253B73] animate-pulse'
            }`}
            style={{
              height: `${dynamicHeight}px`,
              opacity: isListening ? Math.max(0.4, volume / 100) : 0.8,
              animationDelay: `${(i * 0.08).toFixed(2)}s`
            }}
          />
        )
      })}
    </div>
  )
}
