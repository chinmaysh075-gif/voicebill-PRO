import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VoiceInput } from './VoiceInput';
import { ProductSearch } from './ProductSearch';
import { ShoppingCart } from './ShoppingCart';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { Product, CartItem, productService } from '@/services/productService';
import { authService } from '@/services/authService';
import { soundService } from '@/services/soundService';
import { PaymentResult } from '@/services/paymentService';
import { ReceiptData, receiptService } from '@/services/receiptService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import { 
  LogOut, 
  User, 
  BarChart3, 
  Receipt, 
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

interface BillingDashboardProps {
  onLogout: () => void;
}

export function BillingDashboard({ onLogout }: BillingDashboardProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [stats, setStats] = useState(productService.getTodaysStats());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundService.isEnabled());
  // Voice presets to control payment/receipt flows
  const [voicePaymentPreset, setVoicePaymentPreset] = useState<{
    method?: 'cash' | 'card' | 'digital';
    cashAmount?: number;
    submit?: boolean;
  } | null>(null);
  const [voiceReceiptPreset, setVoiceReceiptPreset] = useState<{ print?: boolean } | null>(null);
  const { toast } = useToast();
  const { i18n } = useTranslation();

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(productService.getTodaysStats());
    }, 30000); // Update stats every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Preload products so voice commands can match against Supabase data immediately
  useEffect(() => {
    productService.fetchAllProducts().catch((e) => {
      console.error('Failed to preload products', e);
    });
  }, []);

  // Refresh products when language changes
  useEffect(() => {
    productService.refreshProducts().catch((e) => {
      console.error('Failed to refresh products on language change', e);
    });
  }, [i18n.language]);

  const addToCart = (product: Product, quantity: number = 1) => {
    // Validate inputs
    if (!product || !product.id) {
      toast({
        title: "Invalid Product",
        description: "Cannot add invalid product to cart",
        variant: "destructive"
      });
      return;
    }
    
    // Validate and sanitize quantity
    const sanitizedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    const availableStock = product.stock || 0;
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      const newQuantity = currentQuantity + sanitizedQuantity;
      
      // Check stock availability
      if (newQuantity > availableStock) {
        const maxAddable = Math.max(0, availableStock - currentQuantity);
        if (maxAddable <= 0) {
          toast({
            title: "Out of Stock",
            description: `${product.name} is currently out of stock`,
            variant: "destructive"
          });
          return prevCart; // Don't modify cart
        }
        
        toast({
          title: "Stock Limited",
          description: `Only ${maxAddable} more available. Added ${maxAddable} to cart.`,
          variant: "warning"
        });
        
        const finalQuantity = currentQuantity + maxAddable;
        return prevCart.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: finalQuantity,
                totalPrice: finalQuantity * product.price
              }
            : item
        );
      }
      
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: newQuantity,
                totalPrice: newQuantity * product.price
              }
            : item
        );
      } else {
        return [...prevCart, {
          product,
          quantity: sanitizedQuantity,
          totalPrice: sanitizedQuantity * product.price
        }];
      }
    });

    soundService.playItemAdded();
    toast({
      title: "Item Added",
      description: `${sanitizedQuantity}x ${product.name} added to cart`,
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    // Validate inputs
    if (!productId || typeof quantity !== 'number') {
      return;
    }
    
    // Sanitize quantity
    const sanitizedQuantity = Math.max(0, Math.floor(quantity));
    
    setCart(prevCart => {
      const item = prevCart.find(i => i.product.id === productId);
      if (!item) return prevCart;
      
      // Check stock limit
      const maxQuantity = item.product.stock || 0;
      const finalQuantity = Math.min(sanitizedQuantity, maxQuantity);
      
      if (sanitizedQuantity > maxQuantity) {
        toast({
          title: "Stock Limited",
          description: `Only ${maxQuantity} available in stock`,
          variant: "warning"
        });
      }
      
      if (finalQuantity === 0) {
        // Remove item if quantity is 0
        return prevCart.filter(i => i.product.id !== productId);
      }
      
      return prevCart.map(i =>
        i.product.id === productId
          ? {
              ...i,
              quantity: finalQuantity,
              totalPrice: finalQuantity * i.product.price
            }
          : i
      );
    });
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find(item => item.product.id === productId);
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
    
    if (item) {
      soundService.playClick();
      toast({
        title: "Item Removed",
        description: `${item.product.name} removed from cart`,
      });
    }
  };

  const handleVoiceCommand = (transcript: string) => {
    // Validate input
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      setIsProcessingVoice(false);
      return;
    }
    
    setIsProcessingVoice(true);
    setLastCommand(transcript);
    
    try {
      const result = productService.parseVoiceCommand(transcript, i18n.language);
      
      if (!result) {
        soundService.playError();
        toast({
          title: "Command Not Recognized",
          description: `Could not understand: "${transcript}"`,
          variant: "destructive"
        });
        setTimeout(() => setIsProcessingVoice(false), 1000);
        return;
      }
    
      switch (result.type) {
        case 'add':
          if (result.product && result.quantity) {
            // Additional validation before adding
            if (result.product.stock <= 0) {
              soundService.playError();
              toast({
                title: "Out of Stock",
                description: `${result.product.name} is currently out of stock`,
                variant: "destructive"
              });
            } else {
              addToCart(result.product, result.quantity);
              soundService.playItemAdded();
              toast({
                title: "Item Added",
                description: `Added ${result.quantity}x ${result.product.name} to cart`,
              });
            }
          } else {
            soundService.playError();
            toast({
              title: "Product Not Found",
              description: `Could not find product in: "${transcript}"`,
              variant: "destructive"
            });
          }
          break;
        
        case 'checkout':
          if (cart.reduce((sum, item) => sum + item.quantity, 0) === 0) {
            soundService.playError();
            toast({
              title: "Cart is empty",
              description: "Add items before checkout",
              variant: "destructive"
            });
          } else {
            setVoicePaymentPreset(prev => ({ ...prev, submit: false }));
            setShowPaymentModal(true);
            soundService.playClick();
            toast({ title: "Proceeding to payment" });
          }
          break;

        case 'pay_method':
          if (!showPaymentModal) setShowPaymentModal(true);
          setVoicePaymentPreset(prev => ({ ...prev, method: result.method }));
          soundService.playClick();
          toast({ title: "Payment Method", description: `Selected ${result.method}` });
          break;

        case 'cash_amount':
          if (!showPaymentModal) setShowPaymentModal(true);
          if (typeof result.amount === 'number') {
            setVoicePaymentPreset(prev => ({ ...prev, method: prev?.method ?? 'cash', cashAmount: result.amount }));
            soundService.playClick();
            toast({ title: "Cash Received", description: `$${result.amount.toFixed(2)}` });
          }
          break;

        case 'pay_now':
          if (!showPaymentModal) setShowPaymentModal(true);
          setVoicePaymentPreset(prev => ({ ...prev, submit: true }));
          soundService.playClick();
          toast({ title: "Processing payment..." });
          break;

        case 'print_receipt':
          if (receiptData) {
            setShowReceiptModal(true);
            setVoiceReceiptPreset({ print: true });
            soundService.playClick();
            toast({ title: "Printing receipt" });
          } else {
            soundService.playError();
            toast({ title: "No receipt available", description: "Complete a payment first", variant: "destructive" });
          }
          break;
          
        case 'remove':
          if (result.action === 'remove_last' && cart.length > 0) {
            const lastItem = cart[cart.length - 1];
            removeFromCart(lastItem.product.id);
            soundService.playClick();
            toast({
              title: "Item Removed",
              description: `Removed ${lastItem.product.name} from cart`,
            });
          } else if (result.product) {
            removeFromCart(result.product.id);
            soundService.playClick();
            toast({
              title: "Item Removed",
              description: `Removed ${result.product.name} from cart`,
            });
          }
          break;
          
        case 'clear':
          setCart([]);
          soundService.playClick();
          toast({
            title: "Cart Cleared",
            description: "All items removed from cart",
          });
          break;
          
        case 'unknown':
        default:
          soundService.playError();
          toast({
            title: "Command Not Recognized",
            description: `Could not understand: "${transcript}"`,
            variant: "destructive"
          });
          break;
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      soundService.playError();
      toast({
        title: "Error Processing Command",
        description: "An error occurred while processing your command. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsProcessingVoice(false), 1000);
    }
  };

  const handleCheckout = async () => {
    if (cart.reduce((sum, item) => sum + item.quantity, 0) === 0) return;
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async (paymentResult: PaymentResult) => {
    // Validate payment result
    if (!paymentResult || !paymentResult.success) {
      toast({
        title: "Payment Failed",
        description: paymentResult?.error || "Payment could not be processed",
        variant: "destructive"
      });
      return;
    }
    
    // Validate cart
    if (!cart || cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Cannot complete transaction with empty cart",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessingCheckout(true);
    
    try {
      const bill = productService.createBill(cart, currentUser?.id || 'unknown');
      
      if (!bill || !bill.items || bill.items.length === 0) {
        throw new Error('Invalid bill generated');
      }
      
      const receipt = receiptService.generateReceipt(bill, paymentResult);
      
      if (!receipt) {
        throw new Error('Failed to generate receipt');
      }
      
      soundService.playCheckoutComplete();
      setReceiptData(receipt);
      setCart([]);
      setStats(productService.getTodaysStats());
      setShowPaymentModal(false);
      setVoicePaymentPreset(null);
      setShowReceiptModal(true);
      
      toast({
        title: "Transaction Complete!",
        description: `Payment successful. Total: $${bill.total.toFixed(2)}`,
      });
      
    } catch (error) {
      console.error('Payment completion error:', error);
      soundService.playError();
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundService.setEnabled(newState);
    
    if (newState) {
      soundService.playClick();
    }
    
    toast({
      title: newState ? "Sound Enabled" : "Sound Disabled",
      description: newState ? "Audio feedback is now active" : "Audio feedback is now muted",
    });
  };

  // Language selector component
  const renderLanguageSelector = () => <LanguageSwitcher />;

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">VoiceBill Pro</h1>
              {lastCommand && (
                <Badge variant="outline" className="font-mono text-xs">
                  Last: "{lastCommand}"
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {renderLanguageSelector()}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSound}
                title={soundEnabled ? "Mute sound" : "Unmute sound"}
              >
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <p className="text-xl font-bold font-mono">${stats.totalSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Receipt className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold font-mono">{stats.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Transaction</p>
                <p className="text-xl font-bold font-mono">${stats.averageTransaction.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cart Items</p>
                <p className="text-xl font-bold font-mono">{cart.reduce((sum, item) => sum + item.quantity, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Voice Input & Product Search */}
        <div className="lg:col-span-2 space-y-6">
          <VoiceInput 
            onVoiceCommand={handleVoiceCommand}
            isProcessing={isProcessingVoice}
          />
          <ProductSearch onAddProduct={addToCart} />
        </div>

        {/* Right Column - Shopping Cart */}
        <div className="lg:col-span-1">
          <ShoppingCart
            items={cart}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeFromCart}
            onCheckout={handleCheckout}
            isProcessingCheckout={isProcessingCheckout}
          />
        </div>
      </div>

      {/* Current Session Info */}
      {cart.length > 0 && (
        <div className="mt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Current session: {cart.length} item types, {cart.reduce((sum, item) => sum + item.quantity, 0)} total items.
              Total: ${cart.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setVoicePaymentPreset(null); }}
        total={cart.reduce((sum, item) => sum + item.totalPrice, 0) * 1.08} // Include tax
        onPaymentComplete={handlePaymentComplete}
        voicePreset={voicePaymentPreset}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => { setShowReceiptModal(false); setVoiceReceiptPreset(null); }}
        receiptData={receiptData}
        voicePreset={voiceReceiptPreset}
      />
    </div>
  </div>
);
}