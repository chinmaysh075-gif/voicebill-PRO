import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentMethod, PaymentResult, paymentService } from '@/services/paymentService';
import { soundService } from '@/services/soundService';
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Wallet, 
  Loader2, 
  CheckCircle,
  XCircle,
  DollarSign
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onPaymentComplete: (result: PaymentResult) => void;
  // Voice control preset: choose method, set cash amount, optionally auto-submit
  voicePreset?: {
    method?: 'cash' | 'card' | 'digital';
    cashAmount?: number;
    submit?: boolean;
  } | null;
}

const getPaymentIcon = (iconName: string) => {
  switch (iconName) {
    case 'credit-card': return CreditCard;
    case 'banknote': return Banknote;
    case 'smartphone': return Smartphone;
    case 'wallet': return Wallet;
    default: return DollarSign;
  }
};

export function PaymentModal({ isOpen, onClose, total, onPaymentComplete, voicePreset }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState('');
  const autoSubmittedRef = useRef(false);

  const paymentMethods = paymentService.getAvailablePaymentMethods();

  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(null);
      setCashReceived('');
      setPaymentResult(null);
      setError('');
      setIsProcessing(false);
      autoSubmittedRef.current = false;
    }
  }, [isOpen]);

  // Apply voice preset when provided
  useEffect(() => {
    if (!isOpen) return;
    if (!voicePreset) return;

    // Select method if provided
    if (voicePreset.method) {
      const found = paymentMethods.find(m => m.type === voicePreset.method);
      if (found) setSelectedMethod(found);
    }

    // Set cash amount if provided
    if (typeof voicePreset.cashAmount === 'number' && !isNaN(voicePreset.cashAmount)) {
      setCashReceived(voicePreset.cashAmount.toString());
    }
  }, [voicePreset, isOpen]);

  // Auto-submit when requested and conditions allow
  useEffect(() => {
    if (!isOpen) return;
    if (!voicePreset?.submit) return;
    if (!selectedMethod) return;
    if (selectedMethod.type === 'cash' && !isCashSufficient()) return;
    if (autoSubmittedRef.current) return;
    // Defer to ensure state updates are flushed
    const t = setTimeout(() => {
      autoSubmittedRef.current = true;
      handlePayment();
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voicePreset?.submit, selectedMethod, cashReceived, isOpen]);

  const handlePayment = async () => {
    if (!selectedMethod) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      const cashAmount = selectedMethod.type === 'cash' ? parseFloat(cashReceived) || 0 : undefined;
      
      const result = await paymentService.processPayment({
        amount: total,
        paymentMethod: selectedMethod,
        cashReceived: cashAmount
      });
      
      setPaymentResult(result);
      
      if (result.success) {
        soundService.playSuccess();
        setTimeout(() => {
          onPaymentComplete(result);
          onClose();
        }, 2000);
      } else {
        soundService.playError();
        setError(result.error || 'Payment failed');
      }
    } catch (error) {
      soundService.playError();
      setError('Payment processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateChange = () => {
    if (selectedMethod?.type !== 'cash' || !cashReceived) return 0;
    return Math.max(0, parseFloat(cashReceived) - total);
  };

  const isCashSufficient = () => {
    if (selectedMethod?.type !== 'cash') return true;
    return parseFloat(cashReceived || '0') >= total;
  };

  const quickCashAmounts = [
    Math.ceil(total),
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20
  ].filter((amount, index, arr) => amount >= total && arr.indexOf(amount) === index);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Payment - ${total.toFixed(2)}
          </DialogTitle>
        </DialogHeader>

        {paymentResult?.success ? (
          <div className="text-center py-8 space-y-4 animate-bounce-in">
            <CheckCircle className="w-16 h-16 text-success mx-auto" />
            <h3 className="text-2xl font-bold text-success">Payment Successful!</h3>
            <div className="space-y-2">
              <p>Amount: ${paymentResult.amountPaid.toFixed(2)}</p>
              {paymentResult.change && paymentResult.change > 0 && (
                <p className="text-lg font-semibold">Change: ${paymentResult.change.toFixed(2)}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Transaction ID: {paymentResult.transactionId}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Method Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Payment Method</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {paymentMethods.map((method) => {
                  const IconComponent = getPaymentIcon(method.icon);
                  return (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedMethod?.id === method.id
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setSelectedMethod(method)}
                    >
                      <CardContent className="p-4 text-center">
                        <IconComponent className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-medium">{method.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {method.type}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Cash Payment Details */}
            {selectedMethod?.type === 'cash' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="cashReceived">Cash Received</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="cashReceived"
                        type="number"
                        step="0.01"
                        min="0"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0.00"
                        className="pl-10 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Cash Buttons */}
                <div className="space-y-2">
                  <Label>Quick Amount</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickCashAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setCashReceived(amount.toString())}
                        className="font-mono"
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Change Calculation */}
                {cashReceived && (
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex justify-between items-center">
                      <span>Total:</span>
                      <span className="font-mono">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cash Received:</span>
                      <span className="font-mono">${parseFloat(cashReceived || '0').toFixed(2)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center font-semibold">
                      <span>Change:</span>
                      <span className={`font-mono ${calculateChange() >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ${calculateChange().toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {!isCashSufficient() && (
                  <Alert className="border-warning/50 bg-warning/5">
                    <AlertDescription className="text-warning">
                      Insufficient cash received. Need at least ${total.toFixed(2)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Card/Digital Payment Info */}
            {selectedMethod && selectedMethod.type !== 'cash' && (
              <div className="space-y-4 animate-fade-in">
                <Alert>
                  <AlertDescription>
                    {selectedMethod.type === 'card' 
                      ? 'Please insert or tap your card when prompted'
                      : 'Please follow the prompts on your device to complete payment'
                    }
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {error && (
              <Alert className="border-destructive/50 bg-destructive/5">
                <XCircle className="w-4 h-4" />
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={!selectedMethod || isProcessing || (selectedMethod.type === 'cash' && !isCashSufficient())}
                variant="premium"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${paymentService.formatAmount(total)}`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}