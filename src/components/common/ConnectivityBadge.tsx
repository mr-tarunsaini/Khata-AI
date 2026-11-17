import React from 'react'
import { usePwa } from '@/contexts/PwaContext'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export const ConnectivityBadge: React.FC = () => {
  const { isOnline, pendingSyncCount } = usePwa()

  if (!isOnline) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline</span>
        {pendingSyncCount > 0 && (
          <span className="ml-1 px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px]">
            {pendingSyncCount}
          </span>
        )}
      </div>
    )
  }

  if (pendingSyncCount > 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing ({pendingSyncCount})</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>Online</span>
    </div>
  )
}
