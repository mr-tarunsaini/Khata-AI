/**
 * Professional Digital Receipt & PDF Generator for KhataAI
 * 
 * Generates lightweight, printable, and saveable PDF transaction slips
 * and customer ledger statement cards for Indian Kirana stores.
 * Works 100% offline in PWA and Android devices without external cloud dependencies.
 */

import { Customer, LedgerTransaction, Shop } from '@/types/ledger'
import { formatINR } from '@/lib/money'

export class PdfReceiptService {
  /**
   * Generates clean HTML template for a single transaction slip
   */
  static generateTransactionSlipHtml(
    tx: LedgerTransaction,
    customer: Customer,
    shop: Shop,
    previousBalancePaise: number,
    newBalancePaise: number
  ): string {
    const isCredit = tx.type === 'CREDIT'
    const isReversal = tx.type === 'REVERSAL'
    const typeLabel = isCredit ? 'उधार (Credit)' : isReversal ? 'रिवर्सल (Reversal)' : 'जमा (Payment)'
    const typeColor = isCredit ? '#B42318' : isReversal ? '#A86408' : '#16794B'

    return `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>KhataAI Slip - ${customer.display_name} - ${tx.effective_date}</title>
  <style>
    @page { size: 80mm 140mm; margin: 4mm; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 12px;
      color: #17233B;
      background: #FFFFFF;
      font-size: 13px;
      line-height: 1.4;
    }
    .header { text-align: center; border-bottom: 2px dashed #E3E5E0; padding-bottom: 10px; margin-bottom: 12px; }
    .shop-title { font-size: 18px; font-weight: 800; color: #253B73; margin: 0; }
    .shop-sub { font-size: 11px; color: #667085; margin-top: 2px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; margin-top: 6px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .label { color: #667085; font-size: 12px; }
    .val { font-weight: 600; text-align: right; }
    .amount-box {
      background: #F8F7F2;
      border: 1px solid #E3E5E0;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
      margin: 12px 0;
    }
    .amount-val { font-size: 24px; font-weight: 800; color: ${typeColor}; margin: 2px 0; }
    .balance-summary { border-top: 1px dashed #E3E5E0; padding-top: 10px; margin-top: 10px; }
    .footer { text-align: center; font-size: 10px; color: #667085; border-top: 2px dashed #E3E5E0; padding-top: 8px; margin-top: 14px; }
    .logo-badge { font-weight: bold; color: #253B73; }
    @media print {
      body { width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="shop-title">${shop.name}</h1>
    <div class="shop-sub">मालिक: ${shop.owner_name || 'दुकानदार'} • खाताAI डिजिटल पर्ची</div>
    <div class="badge" style="background: ${typeColor}15; color: ${typeColor};">
      ${typeLabel}
    </div>
  </div>

  <div class="row">
    <span class="label">दिनांक (Date):</span>
    <span class="val">${tx.effective_date}</span>
  </div>
  <div class="row">
    <span class="label">पर्ची सं. (Slip ID):</span>
    <span class="val" style="font-family: monospace; font-size: 10px;">${tx.id.slice(0, 8).toUpperCase()}</span>
  </div>
  <div class="row">
    <span class="label">ग्राहक (Customer):</span>
    <span class="val">${customer.display_name}</span>
  </div>
  ${customer.phone ? `
  <div class="row">
    <span class="label">मोबाइल (Phone):</span>
    <span class="val">${customer.phone}</span>
  </div>` : ''}

  <div class="amount-box">
    <div class="label">${isCredit ? 'नया उधार लिया' : isReversal ? 'रकम रिवर्स हुई' : 'रकम जमा की'}</div>
    <div class="amount-val">${formatINR(tx.amount_paise)}</div>
    <div class="label" style="font-size: 11px;">माध्यम: ${tx.source === 'VOICE' ? '🎙️ आवाज़ (Voice)' : 'मैन्युअल'}</div>
  </div>

  ${tx.note ? `
  <div class="row">
    <span class="label">विवरण (Note):</span>
    <span class="val" style="font-size: 11px;">${tx.note}</span>
  </div>` : ''}

  <div class="balance-summary">
    <div class="row">
      <span class="label">पिछला बाकी (Prev Balance):</span>
      <span class="val">${formatINR(previousBalancePaise)}</span>
    </div>
    <div class="row" style="font-size: 14px; font-weight: bold; margin-top: 4px;">
      <span style="color: #17233B;">कुल बाकी (Total Due):</span>
      <span style="color: #253B73;">${formatINR(newBalancePaise)}</span>
    </div>
  </div>

  <div class="footer">
    <div>धन्यवाद! फिर पधारें।</div>
    <div style="margin-top: 4px;">
      प्रमाणित डिजिटल बहीखाता • <span class="logo-badge">खाताAI</span>
    </div>
  </div>
</body>
</html>
`
  }

  /**
   * Opens the printable transaction receipt in a dedicated print frame/window
   */
  static printOrDownloadReceipt(
    tx: LedgerTransaction,
    customer: Customer,
    shop: Shop,
    previousBalancePaise: number,
    newBalancePaise: number
  ): void {
    const html = this.generateTransactionSlipHtml(tx, customer, shop, previousBalancePaise, newBalancePaise)
    const printWindow = window.open('', '_blank', 'width=450,height=650')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 300)
    }
  }

  /**
   * Generates complete Customer Statement Ledger Card in PDF printable format
   */
  static printOrDownloadCustomerLedgerPdf(
    customer: Customer,
    transactions: LedgerTransaction[],
    shop: Shop,
    currentBalancePaise: number
  ): void {
    const customerTx = transactions.filter((t) => t.customer_id === customer.id && t.status === 'POSTED')

    const rowsHtml = customerTx.map((tx) => {
      const isCredit = tx.type === 'CREDIT'
      const isReversal = tx.type === 'REVERSAL'
      const color = isCredit ? '#B42318' : isReversal ? '#A86408' : '#16794B'
      const sign = isCredit ? '+' : isReversal ? '↺ ' : '-'

      return `
      <tr style="border-bottom: 1px solid #E3E5E0;">
        <td style="padding: 6px 4px; font-size: 11px;">${tx.effective_date}</td>
        <td style="padding: 6px 4px; font-size: 11px;">${tx.type}</td>
        <td style="padding: 6px 4px; font-size: 11px;">${tx.source}</td>
        <td style="padding: 6px 4px; font-size: 11px; text-align: right; font-weight: bold; color: ${color};">
          ${sign}${formatINR(tx.amount_paise)}
        </td>
      </tr>
      `
    }).join('')

    const fullHtml = `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>Khata Statement - ${customer.display_name}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: system-ui, sans-serif; color: #17233B; padding: 16px; margin: 0; font-size: 13px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #253B73; padding-bottom: 12px; margin-bottom: 16px; }
    .shop-name { font-size: 22px; font-weight: 800; color: #253B73; }
    .balance-box { background: #F8F7F2; padding: 12px 18px; border-radius: 12px; text-align: right; border: 1px solid #E3E5E0; }
    .balance-val { font-size: 20px; font-weight: 800; color: #B42318; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th { text-align: left; padding: 8px 4px; background: #F0F1ED; font-size: 11px; color: #667085; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="shop-name">${shop.name}</div>
      <div style="color: #667085; font-size: 12px;">मालिक: ${shop.owner_name || 'दुकानदार'}</div>
      <div style="margin-top: 8px; font-weight: bold; font-size: 15px;">ग्राहक: ${customer.display_name}</div>
      ${customer.phone ? `<div style="color: #667085; font-size: 12px;">फ़ोन: ${customer.phone}</div>` : ''}
    </div>
    <div class="balance-box">
      <div style="font-size: 11px; color: #667085;">वर्तमान कुल बकाया (Outstanding)</div>
      <div class="balance-val">${formatINR(currentBalancePaise)}</div>
      <div style="font-size: 10px; color: #667085;">कुल लेन-देन: ${customerTx.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>दिनांक</th>
        <th>प्रकार</th>
        <th>माध्यम</th>
        <th style="text-align: right;">रकम (INR)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #667085; border-top: 1px dashed #E3E5E0; padding-top: 12px;">
    खाताAI द्वारा प्रमाणित डिजिटल ग्राहक खाता विवरणी • बोलो. लिखो. हिसाब जानो.
  </div>
</body>
</html>
`
    const printWindow = window.open('', '_blank', 'width=700,height=900')
    if (printWindow) {
      printWindow.document.write(fullHtml)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 300)
    }
  }
}
