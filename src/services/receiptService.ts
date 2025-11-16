import { Bill, CartItem } from './productService';
import { PaymentResult } from './paymentService';

export interface ReceiptData {
  bill: Bill;
  paymentResult: PaymentResult;
  businessInfo: BusinessInfo;
  receiptNumber: string;
  timestamp: Date;
}

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  website?: string;
}

class ReceiptService {
  private businessInfo: BusinessInfo = {
    name: 'VoiceBill Pro Store',
    address: '123 Commerce Street, Business District, NY 10001',
    phone: '(555) 123-4567',
    email: 'contact@voicebillpro.com',
    taxId: 'TAX-123456789',
    website: 'www.voicebillpro.com'
  };

  generateReceipt(bill: Bill, paymentResult: PaymentResult): ReceiptData {
    return {
      bill,
      paymentResult,
      businessInfo: this.businessInfo,
      receiptNumber: `RCP-${Date.now()}`,
      timestamp: new Date()
    };
  }

  formatReceiptText(receiptData: ReceiptData): string {
    const { bill, paymentResult, businessInfo, receiptNumber, timestamp } = receiptData;
    
    let receipt = '';
    
    // Header
    receipt += `${businessInfo.name}\n`;
    receipt += `${businessInfo.address}\n`;
    receipt += `Phone: ${businessInfo.phone}\n`;
    receipt += `Email: ${businessInfo.email}\n`;
    if (businessInfo.website) {
      receipt += `Web: ${businessInfo.website}\n`;
    }
    receipt += `Tax ID: ${businessInfo.taxId}\n`;
    receipt += `\n${'='.repeat(40)}\n`;
    
    // Receipt info
    receipt += `Receipt #: ${receiptNumber}\n`;
    receipt += `Date: ${timestamp.toLocaleDateString()}\n`;
    receipt += `Time: ${timestamp.toLocaleTimeString()}\n`;
    receipt += `Cashier: ${bill.cashierId}\n`;
    receipt += `\n${'='.repeat(40)}\n\n`;
    
    // Items
    receipt += 'ITEMS:\n';
    receipt += `${'Item'.padEnd(20)} ${'Qty'.padEnd(5)} ${'Price'.padEnd(8)} ${'Total'.padStart(7)}\n`;
    receipt += `${'-'.repeat(40)}\n`;
    
    bill.items.forEach(item => {
      const itemName = item.product.name.length > 18 
        ? item.product.name.substring(0, 18) + '..' 
        : item.product.name;
      
      receipt += `${itemName.padEnd(20)} `;
      receipt += `${item.quantity.toString().padEnd(5)} `;
      receipt += `$${item.product.price.toFixed(2).padStart(6)} `;
      receipt += `$${item.totalPrice.toFixed(2).padStart(6)}\n`;
    });
    
    receipt += `${'-'.repeat(40)}\n`;
    
    // Totals
    receipt += `Subtotal:${' '.repeat(25)}$${bill.subtotal.toFixed(2).padStart(6)}\n`;
    receipt += `Tax (8%):${' '.repeat(25)}$${bill.tax.toFixed(2).padStart(6)}\n`;
    receipt += `${'='.repeat(40)}\n`;
    receipt += `TOTAL:${' '.repeat(27)}$${bill.total.toFixed(2).padStart(6)}\n`;
    receipt += `${'='.repeat(40)}\n\n`;
    
    // Payment info
    receipt += 'PAYMENT:\n';
    receipt += `Method: ${paymentResult.paymentMethod.name}\n`;
    receipt += `Amount Paid: $${paymentResult.amountPaid.toFixed(2)}\n`;
    
    if (paymentResult.change && paymentResult.change > 0) {
      receipt += `Change: $${paymentResult.change.toFixed(2)}\n`;
    }
    
    if (paymentResult.transactionId) {
      receipt += `Transaction ID: ${paymentResult.transactionId}\n`;
    }
    
    receipt += `\n${'='.repeat(40)}\n`;
    
    // Footer
    receipt += '\nThank you for your business!\n';
    receipt += 'Please keep this receipt for your records.\n';
    receipt += '\nFor support, contact us at:\n';
    receipt += `${businessInfo.email}\n`;
    receipt += `${businessInfo.phone}\n`;
    receipt += '\nPowered by VoiceBill Pro\n';
    receipt += 'Speech-Recognized Billing System\n';
    
    return receipt;
  }

  printReceipt(receiptData: ReceiptData): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const receiptText = this.formatReceiptText(receiptData);
        
        // For demo purposes, we'll open a new window with the receipt
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Receipt - ${receiptData.receiptNumber}</title>
                <style>
                  body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.4;
                    margin: 20px;
                    white-space: pre-wrap;
                  }
                  @media print {
                    body { margin: 0; }
                  }
                </style>
              </head>
              <body>${receiptText}</body>
            </html>
          `);
          
          printWindow.document.close();
          
          // Auto-print after a short delay
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
          
          resolve(true);
        } else {
          console.error('Failed to open print window');
          resolve(false);
        }
      } catch (error) {
        console.error('Print failed:', error);
        resolve(false);
      }
    });
  }

  emailReceipt(receiptData: ReceiptData, email: string): Promise<boolean> {
    // In a real application, this would send an email via backend API
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Receipt emailed to: ${email}`);
        resolve(true);
      }, 1000);
    });
  }

  getBusinessInfo(): BusinessInfo {
    return { ...this.businessInfo };
  }

  updateBusinessInfo(info: Partial<BusinessInfo>): void {
    this.businessInfo = { ...this.businessInfo, ...info };
  }
}

export const receiptService = new ReceiptService();