/**
 * Localized Voice Response Generator for KhataAI
 * 
 * Ensures natural, fluent spoken responses in:
 * - Hindi ('hi') -> Pure polite Hindi
 * - Hinglish ('hi-en') -> Conversational Kirana Hinglish
 * - English ('en') -> Standard Indian English (NEVER speaks Hindi words with English TTS voice)
 */

import { SupportedLanguage } from '@/types/i18n'
import { formatINR, formatSpokenINR } from '@/lib/money'

export class VoiceResponseGenerator {
  /**
   * Spoken confirmation after a transaction is committed
   */
  static transactionSuccess(
    type: 'CREDIT' | 'PAYMENT',
    customerName: string,
    amountPaise: number,
    newBalancePaise: number,
    language: SupportedLanguage
  ): string {
    const amountStr = formatSpokenINR(amountPaise, language)
    const balanceStr = formatINR(newBalancePaise)

    if (language === 'en') {
      if (type === 'CREDIT') {
        return `Recorded ${amountStr} credit for ${customerName}. Total balance is ${balanceStr}.`
      }
      return `Received ${amountStr} payment from ${customerName}. Remaining balance is ${balanceStr}.`
    }

    if (language === 'hi') {
      if (type === 'CREDIT') {
        return `${customerName} के नाम ${amountStr} उधार दर्ज हो गया। कुल बाकी ${balanceStr} है।`
      }
      return `${customerName} से ${amountStr} जमा हो गए। अब बाकी हिसाब ${balanceStr} है।`
    }

    // Hinglish (hi-en)
    if (type === 'CREDIT') {
      return `${customerName} ke naam ${amountStr} udhaar darj ho gaya. Unka total baaki ${balanceStr} hai.`
    }
    return `${customerName} se ${amountStr} payment prapt ho gaya. Ab baaki ${balanceStr} hai.`
  }

  /**
   * Spoken response for balance query
   */
  static customerBalance(customerName: string, balancePaise: number, language: SupportedLanguage): string {
    const balanceStr = formatINR(balancePaise)

    if (language === 'en') {
      if (balancePaise > 0) {
        return `Total outstanding balance for ${customerName} is ${balanceStr}.`
      } else if (balancePaise < 0) {
        return `${customerName} has an advance payment of ${formatINR(Math.abs(balancePaise))}.`
      }
      return `${customerName} has clear balance. No pending dues.`
    }

    if (language === 'hi') {
      if (balancePaise > 0) {
        return `${customerName} का कुल बाकी उधार ${balanceStr} है।`
      } else if (balancePaise < 0) {
        return `${customerName} का एडवांस जमा ${formatINR(Math.abs(balancePaise))} है।`
      }
      return `${customerName} का हिसाब चुकता है।`
    }

    // Hinglish
    return `${customerName} ka total baaki ${balanceStr} hai.`
  }

  /**
   * Spoken response when customer is not found
   */
  static customerNotFound(query: string, language: SupportedLanguage): string {
    if (language === 'en') {
      return `No customer found named ${query}. Would you like to create a new customer?`
    }
    if (language === 'hi') {
      return `"${query}" नाम का कोई ग्राहक नहीं मिला। क्या नया खाता खोलना चाहते हैं?`
    }
    return `"${query}" naam ke koi customer nahi mile. Kya naya khata kholna chahte hain?`
  }

  /**
   * Spoken response for duplicate customer disambiguation
   */
  static duplicateClarification(candidates: { display_name: string }[], language: SupportedLanguage): string {
    const names = candidates.map((c) => c.display_name)
    if (language === 'en') {
      return `There are ${candidates.length} customers with this name: ${names.join(' or ')}?`
    }
    if (language === 'hi') {
      return `इस नाम के ${candidates.length} ग्राहक हैं: ${names.join(' या ')}?`
    }
    return `Is naam ke ${candidates.length} customer hain: ${names.join(' ya ')}?`
  }

  /**
   * Daily Credit Query
   */
  static dailyCredit(creditPaise: number, language: SupportedLanguage): string {
    const amount = formatSpokenINR(creditPaise, language)
    if (language === 'en') {
      return `Today's total credit given is ${amount}.`
    }
    if (language === 'hi') {
      return `आज ${amount} का उधार गया है।`
    }
    return `Aaj ${amount} ka udhaar gaya hai.`
  }

  /**
   * Daily Payment Query
   */
  static dailyPayment(paymentPaise: number, language: SupportedLanguage): string {
    const amount = formatSpokenINR(paymentPaise, language)
    if (language === 'en') {
      return `Today's total payment collected is ${amount}.`
    }
    if (language === 'hi') {
      return `आज ${amount} का पेमेंट मिला है।`
    }
    return `Aaj ${amount} ka payment mila hai.`
  }

  /**
   * Undo success
   */
  static undoSuccess(customerName: string, amountPaise: number, language: SupportedLanguage): string {
    const amount = formatSpokenINR(amountPaise, language)
    if (language === 'en') {
      return `Successfully undone ${amount} transaction for ${customerName}.`
    }
    if (language === 'hi') {
      return `${customerName} का ${amount} का लेन-देन वापस कर दिया गया।`
    }
    return `${customerName} ka ${amount} ka transaction undo kar diya gaya.`
  }

  /**
   * Undo empty
   */
  static undoEmpty(language: SupportedLanguage): string {
    if (language === 'en') {
      return 'No recent transaction found to undo.'
    }
    if (language === 'hi') {
      return 'रद्द करने के लिए कोई हालिया लेन-देन नहीं मिला।'
    }
    return 'Undo karne ke liye koi haaliya transaction nahi mila.'
  }

  /**
   * Inventory query response
   */
  static inventoryStock(itemName: string, quantity: number, unit: string, language: SupportedLanguage): string {
    if (language === 'en') {
      return `Current stock for ${itemName} is ${quantity} ${unit}.`
    }
    if (language === 'hi') {
      return `${itemName} का स्टॉक ${quantity} ${unit} बचा है।`
    }
    return `${itemName} ka stock ${quantity} ${unit} bacha hai.`
  }

  /**
   * Inventory restock response
   */
  static inventoryUpdated(itemName: string, addedQty: number, totalQty: number, unit: string, language: SupportedLanguage): string {
    if (language === 'en') {
      return `Added ${addedQty} ${unit} to ${itemName}. New stock is ${totalQty} ${unit}.`
    }
    if (language === 'hi') {
      return `${itemName} में ${addedQty} ${unit} जोड़ दिया गया। अब नया स्टॉक ${totalQty} ${unit} है।`
    }
    return `${itemName} mein ${addedQty} ${unit} jod diya gaya. Naya stock ${totalQty} ${unit} hai.`
  }

  /**
   * Customer created response
   */
  static customerCreated(customerName: string, language: SupportedLanguage): string {
    if (language === 'en') {
      return `New account opened for ${customerName}.`
    }
    if (language === 'hi') {
      return `${customerName} का नया खाता खुल गया है।`
    }
    return `${customerName} ka naya khata jud gaya hai.`
  }

  /**
   * Missing customer name prompt
   */
  static askCustomerName(language: SupportedLanguage): string {
    if (language === 'en') {
      return 'Please specify the customer name.'
    }
    if (language === 'hi') {
      return 'कृपया ग्राहक का नाम बताएं।'
    }
    return 'Kripya customer ka naam batayein.'
  }

  /**
   * Correction confirmation
   */
  static correctionConfirmed(customerName: string, amountPaise: number, language: SupportedLanguage): string {
    const amount = formatSpokenINR(amountPaise, language)
    if (language === 'en') {
      return `Okay, updating amount for ${customerName} to ${amount}.`
    }
    if (language === 'hi') {
      return `ठीक है, ${customerName} की रकम बदलकर ${amount} कर रहा हूँ।`
    }
    return `Theek hai, ${customerName} ka amount badal kar ${amount} kar raha hoon.`
  }
}
