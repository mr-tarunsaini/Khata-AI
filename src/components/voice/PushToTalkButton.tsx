import React, { useRef, useEffect } from 'react'
import { VoiceSessionStatus } from '@/types/voice'
import { Mic, Loader2, Check, AlertCircle, HelpCircle } from 'lucide-react'
import { soundPlayer } from '@/services/speech/audioPlayer'

interface PushToTalkButtonProps {
  status: VoiceSessionStatus
  onStartCapture: () => void
  onStopCapture: () => void
  onCancelCapture?: () => void
  disabled?: boolean
}

export const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  status,
  onStartCapture,
  onStopCapture,
  disabled = false
}) => {
  const isPressingRef = useRef(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    soundPlayer.unlock()
    isPressingRef.current = true
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40)
    }
    onStartCapture()
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    if (isPressingRef.current) {
      isPressingRef.current = false
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20)
      }
      onStopCapture()
    }
  }

  // Keyboard Spacebar press-to-talk support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (!isPressingRef.current && !disabled) {
          isPressingRef.current = true
          soundPlayer.unlock()
          onStartCapture()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPressingRef.current) {
        isPressingRef.current = false
        onStopCapture()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [disabled, onStartCapture, onStopCapture])

  const isListening = status === 'listening'
  const isProcessing = status === 'processing' || status === 'understanding' || status === 'saving'
  const isSuccess = status === 'success'
  const isClarification = status === 'clarification_required'
  const isError = status === 'error'

  let buttonBg = 'bg-[#253B73] hover:bg-[#1a2b55] text-white'
  let ringClasses = ''

  if (isListening) {
    buttonBg = 'bg-[#087F6E] text-white shadow-2xl scale-105'
    ringClasses = 'animate-pulse-ring'
  } else if (isProcessing) {
    buttonBg = 'bg-[#E7A23B] text-[#17233B]'
  } else if (isSuccess) {
    buttonBg = 'bg-[#16794B] text-white'
  } else if (isClarification) {
    buttonBg = 'bg-[#E7A23B] text-[#17233B]'
  } else if (isError) {
    buttonBg = 'bg-[#B42318] text-white'
  }

  return (
    <div className="relative inline-flex items-center justify-center p-4">
      {/* Visual pulse aura when listening */}
      {isListening && (
        <div className="absolute inset-0 rounded-full bg-[#087F6E]/20 animate-ping pointer-events-none" />
      )}

      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        aria-label="Push to talk microphone button"
        className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-200 select-none cursor-pointer focus:outline-none ${buttonBg} ${ringClasses}`}
      >
        {isListening ? (
          <>
            <Mic className="w-12 h-12 text-white animate-bounce" />
            <span className="text-[11px] font-bold mt-1 text-white tracking-wider">
              बोलें...
            </span>
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#17233B]" />
            <span className="text-[11px] font-bold mt-1 text-[#17233B]">
              प्रोसेसिंग...
            </span>
          </>
        ) : isSuccess ? (
          <>
            <Check className="w-12 h-12 text-white" />
            <span className="text-[11px] font-bold mt-1 text-white">
              सफल!
            </span>
          </>
        ) : isClarification ? (
          <>
            <HelpCircle className="w-10 h-10 text-[#17233B]" />
            <span className="text-[11px] font-bold mt-1 text-[#17233B]">
              स्पष्ट करें
            </span>
          </>
        ) : isError ? (
          <>
            <AlertCircle className="w-10 h-10 text-white" />
            <span className="text-[11px] font-bold mt-1 text-white">
              दोबारा बोलें
            </span>
          </>
        ) : (
          <>
            <Mic className="w-12 h-12 text-white" />
            <span className="text-[11px] font-bold mt-1 text-white/90 tracking-wide">
              दबाकर रखें
            </span>
          </>
        )}
      </button>
    </div>
  )
}
