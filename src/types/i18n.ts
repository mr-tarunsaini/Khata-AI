export type SupportedLanguage = 'hi' | 'hi-en' | 'en'

export interface TranslationDictionary {
  appName: string
  tagline: string
  subtagline: string

  // Navigation
  navDashboard: string
  navVoiceKhata: string
  navCustomers: string
  navTransactions: string
  navSettings: string
  navLogout: string
  navLogin: string
  navSignUp: string

  // Voice States
  voiceIdleHint: string
  voiceListening: string
  voiceProcessing: string
  voiceUnderstanding: string
  voiceClarification: string
  voiceSaving: string
  voiceSuccess: string
  voiceError: string
  voiceOffline: string
  voiceReleaseToStop: string
  voiceCancel: string
  voiceConfirm: string
  voiceRetry: string

  // Dashboard Stats
  totalOutstanding: string
  todayCredit: string
  todayPayment: string
  totalCustomers: string
  recentActivity: string
  topDebtors: string
  viewAll: string
  noTransactionsYet: string

  // Customer Management
  customerName: string
  phoneNumber: string
  balance: string
  lastActive: string
  addCustomer: string
  editCustomer: string
  archiveCustomer: string
  searchCustomerPlaceholder: string
  allCustomers: string
  noCustomersFound: string
  enterCustomerName: string

  // Ledger
  creditLabel: string
  paymentLabel: string
  reversalLabel: string
  adjustmentLabel: string
  date: string
  source: string
  status: string
  amount: string
  allTypes: string
  today: string
  yesterday: string
  last7Days: string
  allTime: string

  // AI Disclosure
  aiDisclosureTitle: string
  aiDisclosureBody: string
  aiDisclosureAcknowledge: string

  // Demo Banner
  demoBadge: string
  demoNotice: string
  resetDemoData: string
  demoDataResetSuccess: string
  quickVoiceScenarios: string
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  hi: {
    appName: 'खाता AI',
    tagline: 'बोलो। लिखो। हिसाब जानो।',
    subtagline: 'किराना दुकानों के लिए भारत का पहला आवाज़-आधारित डिजिटल खाता',

    navDashboard: 'डैशबोर्ड',
    navVoiceKhata: 'आवाज़ खाता',
    navCustomers: 'ग्राहक',
    navTransactions: 'लेन-देन इतिहास',
    navSettings: 'सेटिंग्स',
    navLogout: 'लॉगआउट',
    navLogin: 'लॉग इन',
    navSignUp: 'नया खाता बनाएं',

    voiceIdleHint: 'बोलने के लिए दबाकर रखें',
    voiceListening: 'सुन रहा हूँ...',
    voiceProcessing: 'आवाज़ समझ रहा हूँ...',
    voiceUnderstanding: 'हिसाब निकाला जा रहा है...',
    voiceClarification: 'कृपया स्पष्ट करें',
    voiceSaving: 'खाते में दर्ज कर रहा हूँ...',
    voiceSuccess: 'सफलतापूर्वक दर्ज हो गया!',
    voiceError: 'माफ़ कीजिये, समझ नहीं आया। कृपया दोबारा बोलें।',
    voiceOffline: 'ऑफ़लाइन मोड (नेटवर्क उपलब्ध नहीं)',
    voiceReleaseToStop: 'रोकने के लिए उंगली उठाएं',
    voiceCancel: 'रद्द करें',
    voiceConfirm: 'खाते में लिखें',
    voiceRetry: 'दोबारा बोलें',

    totalOutstanding: 'कुल बाकी उधार',
    todayCredit: 'आज का उधार',
    todayPayment: 'आज की वसूली (पेमेंट)',
    totalCustomers: 'कुल ग्राहक',
    recentActivity: 'हालिया लेन-देन',
    topDebtors: 'अधिक बाकी वाले ग्राहक',
    viewAll: 'सभी देखें',
    noTransactionsYet: 'अभी कोई लेन-देन नहीं है',

    customerName: 'ग्राहक का नाम',
    phoneNumber: 'मोबाइल नंबर (ऐच्छिक)',
    balance: 'बाकी हिसाब',
    lastActive: 'अंतिम लेन-देन',
    addCustomer: 'नया ग्राहक जोड़ें',
    editCustomer: 'ग्राहक संपादित करें',
    archiveCustomer: 'आर्काइव करें',
    searchCustomerPlaceholder: 'ग्राहक का नाम खोजें...',
    allCustomers: 'सभी ग्राहक',
    noCustomersFound: 'कोई ग्राहक नहीं मिला',
    enterCustomerName: 'ग्राहक का नाम दर्ज करें',

    creditLabel: 'उधार (दिया)',
    paymentLabel: 'जमा (पाया)',
    reversalLabel: 'रद्द (उलटा)',
    adjustmentLabel: 'समायोजन',
    date: 'तारीख',
    source: 'स्रोत',
    status: 'स्थिति',
    amount: 'रकम',
    allTypes: 'सभी प्रकार',
    today: 'आज',
    yesterday: 'कल',
    last7Days: 'पिछले 7 दिन',
    allTime: 'शुरुआत से',

    aiDisclosureTitle: 'AI सहायक सूचना',
    aiDisclosureBody: 'नमस्ते! मैं खाताAI हूँ — आपकी दुकान का आवाज़ से चलने वाला डिजिटल मुनीम। मैं आपकी आवाज़ को सुनकर हिसाब दर्ज करता हूँ। सभी वित्तीय गणनाएं प्रमाणित नियमों से होती हैं।',
    aiDisclosureAcknowledge: 'समझ गया, शुरू करें',

    demoBadge: 'डेमो मोड',
    demoNotice: 'यह सुरक्षित डेमो मोड है। आप बिना किसी बाहरी API के बोलकर लेन-देन आज़मा सकते हैं।',
    resetDemoData: 'डेमो डेटा रीसेट करें',
    demoDataResetSuccess: 'डेमो डेटा सफलतापूर्वक रीसेट हो गया',
    quickVoiceScenarios: 'नमूना आवाज़ परीक्षण'
  },
  'hi-en': {
    appName: 'KhataAI',
    tagline: 'Bolo. Likho. Hisaab Jaano.',
    subtagline: 'Kirana dukaanon ke liye Bharat ka pehla voice-powered digital khata',

    navDashboard: 'Dashboard',
    navVoiceKhata: 'Voice Khata',
    navCustomers: 'Grahak',
    navTransactions: 'Hisaab History',
    navSettings: 'Settings',
    navLogout: 'Logout',
    navLogin: 'Login',
    navSignUp: 'Sign Up',

    voiceIdleHint: 'Bolne ke liye press karke rakhein',
    voiceListening: 'Sun raha hoon...',
    voiceProcessing: 'Awaaz samajh raha hoon...',
    voiceUnderstanding: 'Hisaab nikaal raha hoon...',
    voiceClarification: 'Kripya clarify karein',
    voiceSaving: 'Khate me darj kar raha hoon...',
    voiceSuccess: 'Successfully darj ho gaya!',
    voiceError: 'Sorry, samajh nahi aaya. Dobara boliye.',
    voiceOffline: 'Offline Mode (No Internet)',
    voiceReleaseToStop: 'Rokne ke liye chodiye',
    voiceCancel: 'Cancel',
    voiceConfirm: 'Khate me likhein',
    voiceRetry: 'Dobara bole',

    totalOutstanding: 'Total Baaki Udhaar',
    todayCredit: 'Aaj Ka Udhaar',
    todayPayment: 'Aaj Ki Payment',
    totalCustomers: 'Total Grahak',
    recentActivity: 'Recent Transactions',
    topDebtors: 'Top Baaki Grahak',
    viewAll: 'Sabhi Dekhein',
    noTransactionsYet: 'Abhi koi entry nahi hai',

    customerName: 'Grahak Ka Naam',
    phoneNumber: 'Phone Number (Optional)',
    balance: 'Total Baaki',
    lastActive: 'Last Active',
    addCustomer: 'Naya Grahak Jodein',
    editCustomer: 'Edit Grahak',
    archiveCustomer: 'Archive Karein',
    searchCustomerPlaceholder: 'Grahak ka naam khojein...',
    allCustomers: 'Sabhi Grahak',
    noCustomersFound: 'Koi grahak nahi mila',
    enterCustomerName: 'Grahak ka naam daalein',

    creditLabel: 'Udhaar (Diya)',
    paymentLabel: 'Payment (Aaya)',
    reversalLabel: 'Reversal',
    adjustmentLabel: 'Adjustment',
    date: 'Date',
    source: 'Source',
    status: 'Status',
    amount: 'Amount',
    allTypes: 'All Types',
    today: 'Aaj',
    yesterday: 'Kal',
    last7Days: 'Last 7 Days',
    allTime: 'All Time',

    aiDisclosureTitle: 'AI Assistant Notice',
    aiDisclosureBody: 'Namaste! Main KhataAI hoon — aapki dukaan ka voice-powered digital khata assistant. Main aapki baat sunkar entry prepare karta hoon aur hisaab pakka rakhta hoon.',
    aiDisclosureAcknowledge: 'Theek hai, shuru karein',

    demoBadge: 'DEMO MODE',
    demoNotice: 'KhataAI is running in verified Demo Mode with synthetic customers and deterministic offline logic.',
    resetDemoData: 'Reset Demo Data',
    demoDataResetSuccess: 'Demo data has been reset to defaults',
    quickVoiceScenarios: 'Quick Voice Prompts'
  },
  en: {
    appName: 'KhataAI',
    tagline: 'Speak. Record. Know Your Balance.',
    subtagline: "India's first voice-powered digital khata for kirana store owners",

    navDashboard: 'Dashboard',
    navVoiceKhata: 'Voice Khata',
    navCustomers: 'Customers',
    navTransactions: 'Transactions',
    navSettings: 'Settings',
    navLogout: 'Sign Out',
    navLogin: 'Sign In',
    navSignUp: 'Sign Up',

    voiceIdleHint: 'Press and hold to speak',
    voiceListening: 'Listening...',
    voiceProcessing: 'Processing voice...',
    voiceUnderstanding: 'Understanding intent...',
    voiceClarification: 'Clarification required',
    voiceSaving: 'Saving to ledger...',
    voiceSuccess: 'Saved to ledger successfully!',
    voiceError: 'Sorry, could not understand. Please speak again.',
    voiceOffline: 'Offline Mode (No Internet)',
    voiceReleaseToStop: 'Release to finish speaking',
    voiceCancel: 'Cancel',
    voiceConfirm: 'Confirm Entry',
    voiceRetry: 'Try Again',

    totalOutstanding: 'Total Outstanding Credit',
    todayCredit: "Today's Credit",
    todayPayment: "Today's Payments",
    totalCustomers: 'Total Customers',
    recentActivity: 'Recent Transactions',
    topDebtors: 'Top Outstanding Customers',
    viewAll: 'View All',
    noTransactionsYet: 'No transactions recorded yet',

    customerName: 'Customer Name',
    phoneNumber: 'Phone Number (Optional)',
    balance: 'Current Balance',
    lastActive: 'Last Activity',
    addCustomer: 'Add Customer',
    editCustomer: 'Edit Customer',
    archiveCustomer: 'Archive Customer',
    searchCustomerPlaceholder: 'Search customer name...',
    allCustomers: 'All Customers',
    noCustomersFound: 'No customers found',
    enterCustomerName: 'Enter customer name',

    creditLabel: 'Credit (Given)',
    paymentLabel: 'Payment (Received)',
    reversalLabel: 'Reversal',
    adjustmentLabel: 'Adjustment',
    date: 'Date',
    source: 'Source',
    status: 'Status',
    amount: 'Amount',
    allTypes: 'All Types',
    today: 'Today',
    yesterday: 'Yesterday',
    last7Days: 'Last 7 Days',
    allTime: 'All Time',

    aiDisclosureTitle: 'AI Assistant Disclosure',
    aiDisclosureBody: 'Welcome! KhataAI is an automated voice assistant designed to accurately record your shop ledger entries. All calculations are executed deterministically.',
    aiDisclosureAcknowledge: 'I Understand, Let’s Start',

    demoBadge: 'DEMO MODE',
    demoNotice: 'KhataAI is currently operating in verified Demo Mode with synthetic customers.',
    resetDemoData: 'Reset Demo Data',
    demoDataResetSuccess: 'Demo data has been reset to defaults',
    quickVoiceScenarios: 'Quick Voice Scenarios'
  }
}
