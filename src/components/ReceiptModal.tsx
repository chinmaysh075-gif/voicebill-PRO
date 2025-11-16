import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReceiptData, receiptService } from '@/services/receiptService';
import { soundService } from '@/services/soundService';
import { useToast } from '@/hooks/use-toast';
import { 
  Printer, 
  Mail, 
  Download, 
  Receipt as ReceiptIcon,
  Loader2,
  CheckCircle
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
  // Voice control: allow auto-print when requested
  voicePreset?: { print?: boolean } | null;
}

export function ReceiptModal({ isOpen, onClose, receiptData, voicePreset }: ReceiptModalProps) {
  const [email, setEmail] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  // Auto-print on voice command
  useEffect(() => {
    if (!isOpen) return;
    if (!voicePreset?.print) return;
    // Avoid re-entrancy while already printing
    if (isPrinting) return;
    const t = setTimeout(() => {
      handlePrint();
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voicePreset?.print, isOpen]);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const success = await receiptService.printReceipt(receiptData);
      if (success) {
        soundService.playSuccess();
        toast({
          title: "Receipt Printed",
          description: "Receipt sent to printer successfully",
        });
      } else {
        soundService.playError();
        toast({
          title: "Print Failed",
          description: "Could not print receipt. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      soundService.playError();
      toast({
        title: "Print Error",
        description: "An error occurred while printing",
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleEmailSend = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsEmailSending(true);
    try {
      const success = await receiptService.emailReceipt(receiptData, email);
      if (success) {
        soundService.playSuccess();
        toast({
          title: "Receipt Emailed",
          description: `Receipt sent to ${email}`,
        });
        setEmail('');
      } else {
        soundService.playError();
        toast({
          title: "Email Failed",
          description: "Could not send email. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      soundService.playError();
      toast({
        title: "Email Error",  
        description: "An error occurred while sending email",
        variant: "destructive"
      });
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleDownload = () => {
    try {
      const receiptText = receiptService.formatReceiptText(receiptData);
      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptData.receiptNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      soundService.playSuccess();
      toast({
        title: "Receipt Downloaded",
        description: "Receipt saved to your downloads folder",
      });
    } catch (error) {
      soundService.playError();
      toast({
        title: "Download Failed",
        description: "Could not download receipt",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptIcon className="w-6 h-6" />
            {receiptData ? `Receipt - ${receiptData.receiptNumber}` : 'Receipt'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {!receiptData ? (
            <div className="p-6 text-sm text-muted-foreground">
              No receipt available.
            </div>
          ) : (
            <>
              {/* Receipt Preview */}
              <div className="flex-1 overflow-auto">
                <div className="p-4 bg-muted rounded-lg border">
                  <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {receiptService.formatReceiptText(receiptData)}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4 border-t pt-4">
                {/* Email Section */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Receipt</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleEmailSend}
                      disabled={isEmailSending || !email}
                      variant="outline"
                    >
                      {isEmailSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {isEmailSending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePrint}
                      disabled={isPrinting}
                      variant="default"
                      size="lg"
                    >
                      {isPrinting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                      {isPrinting ? 'Printing...' : 'Print'}
                    </Button>
                    
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      size="lg"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>

                  <Button onClick={onClose} variant="secondary" size="lg">
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
          {/* Success Message */}
          {receiptData && (
            <Alert className="border-success/50 bg-success/5">
              <CheckCircle className="w-4 h-4" />
              <AlertDescription className="text-success">
                Transaction completed successfully! Total: ${receiptData.bill.total.toFixed(2)}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}