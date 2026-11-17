import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ActiveTab } from './Sidebar'
import { LayoutDashboard, Users, Mic, Receipt, Settings } from 'lucide-react'

interface BottomNavProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-[#E3E5E0] shadow-lg pb-safe">
      <div className="flex items-center justify-around h-16 px-2 relative">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === 'dashboard' ? 'text-[#253B73]' : 'text-[#667085]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">{t.navDashboard}</span>
        </button>

        {/* Customers */}
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === 'customers' ? 'text-[#253B73]' : 'text-[#667085]'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">{t.navCustomers}</span>
        </button>

        {/* Center Hero Voice Mic Button (Elevated) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => setActiveTab('voice')}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-[#087F6E] text-white ring-4 ring-[#087F6E]/30 animate-pulse'
                : 'bg-[#253B73] text-white hover:bg-[#1a2b55]'
            }`}
            aria-label="Voice Khata"
          >
            <Mic className="w-7 h-7" />
          </button>
        </div>

        {/* Transactions */}
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === 'transactions' ? 'text-[#253B73]' : 'text-[#667085]'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">{t.navTransactions}</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === 'settings' ? 'text-[#253B73]' : 'text-[#667085]'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">{t.navSettings}</span>
        </button>
      </div>
    </nav>
  )
}
