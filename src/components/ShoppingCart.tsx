import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CartItem, productService } from '@/services/productService';
import { Trash2, Plus, Minus, ShoppingCart as CartIcon, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  isProcessingCheckout?: boolean;
}

export function ShoppingCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  isProcessingCheckout = false 
}: ShoppingCartProps) {
  const { i18n } = useTranslation();
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleQuantityChange = (productId: string, newQuantity: string) => {
    const quantity = parseInt(newQuantity) || 0;
    if (quantity > 0) {
      onUpdateQuantity(productId, quantity);
    }
  };

  const increaseQuantity = (productId: string, currentQuantity: number) => {
    onUpdateQuantity(productId, currentQuantity + 1);
  };

  const decreaseQuantity = (productId: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      onUpdateQuantity(productId, currentQuantity - 1);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CartIcon className="w-5 h-5" />
            Cart
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="space-y-2">
              <CartIcon className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Cart is empty</p>
              <p className="text-sm text-muted-foreground">
                Add items using voice commands or search
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 space-y-3 mb-6">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{productService.getProductNameInLanguage(item.product, i18n.language)}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {item.product.category}
                      </Badge>
                      <span>${item.product.price.toFixed(2)} each</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => decreaseQuantity(item.product.id, item.quantity)}
                      className="h-8 w-8"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.product.id, e.target.value)}
                      className="w-16 h-8 text-center font-mono"
                      min="1"
                    />
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => increaseQuantity(item.product.id, item.quantity)}
                      className="h-8 w-8"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-semibold">
                      ${item.totalPrice.toFixed(2)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.product.id)}
                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (8%):</span>
                <span className="font-mono">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t border-border pt-2">
                <span>Total:</span>
                <span className="font-mono text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={onCheckout}
              disabled={isProcessingCheckout}
              variant="premium"
              size="lg"
              className="w-full mt-4"
            >
              <Receipt className="w-4 h-4" />
              {isProcessingCheckout ? 'Processing...' : 'Checkout'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}