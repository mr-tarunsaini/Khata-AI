import React, { useState } from 'react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { PwaProvider } from '@/contexts/PwaContext'
import { LedgerProvider, useLedger } from '@/contexts/LedgerContext'
import { Navbar } from '@/components/common/Navbar'
import { Sidebar, ActiveTab } from '@/components/common/Sidebar'
import { BottomNav } from '@/components/common/BottomNav'
import { AIDisclosureModal } from '@/components/common/AIDisclosureModal'
import { LandingPage } from '@/components/landing/LandingPage'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { VoiceKhataView } from '@/components/voice/VoiceKhataView'
import { CustomersView } from '@/components/customers/CustomersView'
import { TransactionsView } from '@/components/ledger/TransactionsView'
import { InventoryView } from '@/components/inventory/InventoryView'
import { SettingsView } from '@/components/settings/SettingsView'
import { AuthView } from '@/components/auth/AuthView'
import { UndoToast } from '@/components/common/UndoToast'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

const MainAppContent: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { selectedCustomerId, setSelectedCustomerId } = useLedger()

  const [showLanding, setShowLanding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('khata_ai_visited')
    }
    return false
  })

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // If showing landing page
  if (showLanding) {
    return (
      <LandingPage
        onGetStarted={() => {
          localStorage.setItem('khata_ai_visited', 'true')
          setShowLanding(false)
          setActiveTab('dashboard')
        }}
      />
    )
  }

  // If user is not authenticated and not running in demo
  if (!isAuthenticated) {
    return <AuthView onSuccess={() => setActiveTab('dashboard')} />
  }

  return (
    <div className="h-screen bg-[#F8F7F2] flex flex-col antialiased overflow-hidden">
      {/* 1. First-Turn AI Disclosure Modal (in Hindi/Hinglish) */}
      <AIDisclosureModal />

      {/* 2. Top Header Navbar (Fixed Height) */}
      <Navbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* 3. App Body: Desktop Fixed Sidebar + Main Scrollable Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Desktop Fixed Sidebar / Mobile Drawer */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Dynamic Center Main Content Area (Independent scroll container) */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenVoice={() => setActiveTab('voice')}
              onOpenCustomers={() => setActiveTab('customers')}
              onOpenTransactions={() => setActiveTab('transactions')}
              onSelectCustomer={(id) => {
                setSelectedCustomerId(id)
                setActiveTab('customers')
              }}
            />
          )}

          {activeTab === 'voice' && (
            <ErrorBoundary>
              <VoiceKhataView />
            </ErrorBoundary>
          )}

          {activeTab === 'customers' && (
            <CustomersView
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={setSelectedCustomerId}
              onOpenVoice={() => setActiveTab('voice')}
            />
          )}

          {activeTab === 'transactions' && <TransactionsView />}

          {activeTab === 'inventory' && (
            <InventoryView onOpenVoice={() => setActiveTab('voice')} />
          )}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* 4. Global 5-Second Transaction Undo Toast */}
      <UndoToast />

      {/* 5. Mobile Bottom Navigation Bar with Hero Voice Mic */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PwaProvider>
          <LedgerProvider>
            <MainAppContent />
          </LedgerProvider>
        </PwaProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
