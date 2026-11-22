import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLedger } from '@/contexts/LedgerContext'
import { formatINR } from '@/lib/money'
import {
  LayoutDashboard,
  Mic,
  Users,
  Receipt,
  Settings,
  LogOut,
  TrendingUp,
  Boxes,
  X
} from 'lucide-react'

export type ActiveTab = 'dashboard' | 'voice' | 'customers' | 'transactions' | 'inventory' | 'settings'

interface SidebarProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { t } = useLanguage()
  const { user, shop, logout } = useAuth()
  const { todayAggregates, isInventoryEnabled } = useLedger()

  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'voice', label: t.navVoiceKhata, icon: Mic, isHero: true },
    { id: 'customers', label: t.navCustomers, icon: Users },
    { id: 'transactions', label: t.navTransactions, icon: Receipt },
    ...(isInventoryEnabled
      ? [{ id: 'inventory', label: 'इन्वेंट्री (Stock)', icon: Boxes }]
      : []),
    { id: 'settings', label: t.navSettings, icon: Settings }
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#E3E5E0] w-64 select-none">
      {/* Top Header inside sidebar */}
      <div className="p-4 border-b border-[#E3E5E0] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#253B73] flex items-center justify-center text-white font-bold text-sm">
            खा
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#17233B] truncate max-w-[140px]">
              {shop?.name || 'KhataAI'}
            </h2>
            <p className="text-[11px] text-[#087F6E] font-medium">
              {user?.role === 'OWNER' ? 'Shop Owner' : 'Staff'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[#667085] hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as ActiveTab)
                if (onClose) onClose()
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-[#253B73] text-white shadow-xs'
                  : item.isHero
                  ? 'bg-[#087F6E]/10 text-[#087F6E] hover:bg-[#087F6E]/20'
                  : 'text-[#17233B] hover:bg-[#F8F7F2]'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive
                    ? 'text-white'
                    : item.isHero
                    ? 'text-[#087F6E]'
                    : 'text-[#667085]'
                }`}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.isHero && !isActive && (
                <span className="w-2 h-2 rounded-full bg-[#087F6E] animate-pulse" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Mini Financial Summary Card */}
      <div className="p-3 m-3 rounded-xl bg-[#F8F7F2] border border-[#E3E5E0] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
            {t.today}
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#087F6E]" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#667085]">उधार (Credit):</span>
            <span className="font-bold text-[#B42318]">{formatINR(todayAggregates.total_credit_paise)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#667085]">जमा (Payment):</span>
            <span className="font-bold text-[#16794B]">{formatINR(todayAggregates.total_payment_paise)}</span>
          </div>
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-[#E3E5E0] shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#B42318] hover:bg-red-50 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.navLogout}</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Fixed Sidebar */}
      <aside className="hidden lg:block shrink-0 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
