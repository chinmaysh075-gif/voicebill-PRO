import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BusinessInfo, receiptService } from '@/services/receiptService';
import { soundService } from '@/services/soundService';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Volume2, 
  VolumeX, 
  Store, 
  Receipt,
  Keyboard,
  Palette
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(receiptService.getBusinessInfo());
  const [soundEnabled, setSoundEnabled] = useState(soundService.isEnabled());
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const { toast } = useToast();

  const handleSave = () => {
    receiptService.updateBusinessInfo(businessInfo);
    soundService.setEnabled(soundEnabled);
    
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully",
    });
    
    onClose();
  };

  const handleReset = () => {
    const defaultBusiness: BusinessInfo = {
      name: 'VoiceBill Pro Store',
      address: '123 Commerce Street, Business District, NY 10001',
      phone: '(555) 123-4567',
      email: 'contact@voicebillpro.com',
      taxId: 'TAX-123456789',
      website: 'www.voicebillpro.com'
    };
    
    setBusinessInfo(defaultBusiness);
    setSoundEnabled(true);
    setKeyboardShortcuts(true);
    setAutoSave(true);
    
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            System Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessInfo.name}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={businessInfo.email}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={businessInfo.website || ''}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={businessInfo.taxId}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, taxId: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sound Settings */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  <div>
                    <Label className="text-base">Sound Effects</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable audio feedback for actions and voice commands
                    </p>
                  </div>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>

              <Separator />

              {/* Keyboard Shortcuts */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-5 h-5" />
                  <div>
                    <Label className="text-base">Keyboard Shortcuts</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable keyboard shortcuts for faster navigation
                    </p>
                  </div>
                </div>
                <Switch
                  checked={keyboardShortcuts}
                  onCheckedChange={setKeyboardShortcuts}
                />
              </div>

              <Separator />

              {/* Auto Save */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5" />
                  <div>
                    <Label className="text-base">Auto-save Transactions</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save transaction data locally
                    </p>
                  </div>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts Reference */}
          {keyboardShortcuts && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  Keyboard Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Start Voice Input</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + M</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Clear Cart</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + X</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Checkout</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + Enter</kbd>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Search Products</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + F</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Settings</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + ,</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Toggle Sound</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + S</kbd>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} variant="premium">
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}