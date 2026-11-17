import React from 'react'

interface AudioWaveformProps {
  isListening: boolean
  isProcessing?: boolean
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ isListening, isProcessing }) => {
  if (!isListening && !isProcessing) return null

  // 12 animated frequency bars
  const heights = [16, 28, 40, 24, 36, 48, 32, 44, 20, 36, 28, 16]

  return (
    <div className="flex items-center justify-center gap-1.5 h-14 my-3 px-4">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-[#087F6E] animate-wave-bar'
              : 'bg-[#253B73] animate-pulse'
          }`}
          style={{
            height: isListening ? `${h}px` : '10px',
            animationDelay: `${(i * 0.08).toFixed(2)}s`
          }}
        />
      ))}
    </div>
  )
}
