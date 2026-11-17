import React, { useState } from 'react'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { PwaProvider } from '@/contexts/PwaContext'
import { LedgerProvider, useLedger } from '@/contexts/LedgerContext'
import { Navbar } from '@/components/common/Navbar'
import { Sidebar, ActiveTab } from '@/components/common/Sidebar'
import { BottomNav } from '@/components/common/BottomNav'
import { DemoModeBanner } from '@/components/common/DemoModeBanner'
import { AIDisclosureModal } from '@/components/common/AIDisclosureModal'
import { LandingPage } from '@/components/landing/LandingPage'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { VoiceKhataView } from '@/components/voice/VoiceKhataView'
import { CustomersView } from '@/components/customers/CustomersView'
import { TransactionsView } from '@/components/ledger/TransactionsView'
import { SettingsView } from '@/components/settings/SettingsView'
import { AuthView } from '@/components/auth/AuthView'

const MainAppContent: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { selectedCustomerId, setSelectedCustomerId } = useLedger()

  const [showLanding, setShowLanding] = useState<boolean>(() => {
    // If user has visited before or opened specific tab, skip landing
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('khata_ai_visited')
    }
    return false
  })

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Quick scenario runner from DemoModeBanner
  const handleSelectScenario = (transcriptText: string) => {
    setActiveTab('voice')
  }

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
    <div className="min-h-screen bg-[#F8F7F2] flex flex-col antialiased">
      {/* 1. First-Turn AI Disclosure Modal (in Hindi/Hinglish) */}
      <AIDisclosureModal />

      {/* 2. Top Header Navbar */}
      <Navbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* 3. Demo Mode Banner with Quick Scenario Prompts */}
      <DemoModeBanner onSelectScenario={handleSelectScenario} />

      {/* 4. App Body: Desktop Sidebar + Main Content Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Desktop Sidebar / Mobile Drawer */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Dynamic Center Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-12">
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

          {activeTab === 'voice' && <VoiceKhataView />}

          {activeTab === 'customers' && (
            <CustomersView
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={setSelectedCustomerId}
              onOpenVoice={() => setActiveTab('voice')}
            />
          )}

          {activeTab === 'transactions' && <TransactionsView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

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
