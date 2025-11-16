export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'digital' | 'other';
  icon: string;
  enabled: boolean;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  amountPaid: number;
  change?: number;
  paymentMethod: PaymentMethod;
}

export interface PaymentRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number; // For cash payments
}

class PaymentService {
  private paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Cash',
      type: 'cash',
      icon: 'banknote',
      enabled: true
    },
    {
      id: 'credit_card',
      name: 'Credit Card',
      type: 'card',
      icon: 'credit-card',
      enabled: true
    },
    {
      id: 'debit_card',
      name: 'Debit Card',
      type: 'card',
      icon: 'credit-card',
      enabled: true
    },
    {
      id: 'mobile_pay',
      name: 'Mobile Pay',
      type: 'digital',
      icon: 'smartphone',
      enabled: true
    },
    {
      id: 'digital_wallet',
      name: 'Digital Wallet',
      type: 'digital',
      icon: 'wallet',
      enabled: true
    }
  ];

  getAvailablePaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(method => method.enabled);
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    const { amount, paymentMethod, cashReceived } = request;

    // Handle cash payments
    if (paymentMethod.type === 'cash') {
      if (!cashReceived || cashReceived < amount) {
        return {
          success: false,
          error: 'Insufficient cash received',
          amountPaid: cashReceived || 0,
          paymentMethod
        };
      }

      const change = cashReceived - amount;
      return {
        success: true,
        transactionId: `CASH-${Date.now()}`,
        amountPaid: amount,
        change,
        paymentMethod
      };
    }

    // Handle card/digital payments
    // Simulate 95% success rate
    const isSuccessful = Math.random() > 0.05;

    if (isSuccessful) {
      return {
        success: true,
        transactionId: `${paymentMethod.type.toUpperCase()}-${Date.now()}`,
        amountPaid: amount,
        paymentMethod
      };
    } else {
      const errors = [
        'Card declined',
        'Insufficient funds',
        'Network error',
        'Card expired',
        'Transaction timeout'
      ];
      
      return {
        success: false,
        error: errors[Math.floor(Math.random() * errors.length)],
        amountPaid: 0,
        paymentMethod
      };
    }
  }

  calculateChange(total: number, received: number): number {
    return Math.max(0, received - total);
  }

  formatAmount(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  // Simulate card reader status
  getCardReaderStatus(): { online: boolean; batteryLevel?: number } {
    return {
      online: Math.random() > 0.1, // 90% uptime
      batteryLevel: Math.floor(Math.random() * 100)
    };
  }
}

export const paymentService = new PaymentService();