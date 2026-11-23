import React, { useEffect } from 'react'
import { VoiceSessionStatus } from '@/types/voice'
import { Mic, Loader2, Check, AlertCircle, HelpCircle } from 'lucide-react'

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
  const isListening = status === 'listening'
  const isProcessing = status === 'processing' || status === 'understanding' || status === 'saving'
  const isSuccess = status === 'success'
  const isClarification = status === 'clarification_required'
  const isError = status === 'error'

  // YouTube-like click to start, click again to stop
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30)
    }

    if (isListening) {
      onStopCapture()
    } else if (!isProcessing) {
      onStartCapture()
    }
  }

  // Keyboard Spacebar or Enter toggle support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (disabled || isProcessing) return
        e.preventDefault()
        if (isListening) {
          onStopCapture()
        } else {
          onStartCapture()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [disabled, isListening, isProcessing, onStartCapture, onStopCapture])

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
    <div className="relative inline-flex items-center justify-center p-4 notranslate" translate="no">
      {/* Visual pulse aura when listening */}
      {isListening && (
        <div key="aura" className="absolute inset-0 rounded-full bg-[#087F6E]/20 animate-ping pointer-events-none" />
      )}

      <button
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled || isProcessing}
        aria-label="Microphone voice search button"
        className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-200 select-none cursor-pointer focus:outline-none ${buttonBg} ${ringClasses}`}
      >
        {isListening ? (
          <div key="state-listening" className="flex flex-col items-center justify-center pointer-events-none">
            <Mic className="w-12 h-12 text-white animate-bounce" />
            <span className="text-[11px] font-bold mt-1 text-white tracking-wider text-center leading-tight">
              बोलें...<br />(सुन रहा है)
            </span>
          </div>
        ) : isProcessing ? (
          <div key="state-processing" className="flex flex-col items-center justify-center pointer-events-none">
            <Loader2 className="w-10 h-10 animate-spin text-[#17233B]" />
            <span className="text-[11px] font-bold mt-1 text-[#17233B]">
              प्रोसेसिंग...
            </span>
          </div>
        ) : isSuccess ? (
          <div key="state-success" className="flex flex-col items-center justify-center pointer-events-none">
            <Check className="w-12 h-12 text-white" />
            <span className="text-[11px] font-bold mt-1 text-white">
              सफल!
            </span>
          </div>
        ) : isClarification ? (
          <div key="state-clarify" className="flex flex-col items-center justify-center pointer-events-none">
            <HelpCircle className="w-10 h-10 text-[#17233B]" />
            <span className="text-[11px] font-bold mt-1 text-[#17233B]">
              स्पष्ट करें
            </span>
          </div>
        ) : isError ? (
          <div key="state-error" className="flex flex-col items-center justify-center pointer-events-none">
            <AlertCircle className="w-10 h-10 text-white" />
            <span className="text-[11px] font-bold mt-1 text-white">
              दोबारा बोलें
            </span>
          </div>
        ) : (
          <div key="state-idle" className="flex flex-col items-center justify-center pointer-events-none">
            <Mic className="w-12 h-12 text-white" />
            <span className="text-[11px] font-bold mt-1 text-white/90 tracking-wide text-center leading-tight">
              टैप करें<br />और बोलें
            </span>
          </div>
        )}
      </button>
    </div>
  )
}
