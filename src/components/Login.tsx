import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { Mic, ShoppingCart, Users, BarChart3 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await authService.login(credentials.username, credentials.password);
    
    if (result.success) {
      toast({
        title: "Welcome!",
        description: `Logged in as ${result.user?.name}`,
      });
      onLogin();
    } else {
      setError(result.error || 'Login failed');
    }
    
    setIsLoading(false);
  };

  const demoCredentials = authService.getDemoCredentials();

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="text-center lg:text-left space-y-6">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
            <div className="p-3 rounded-xl bg-gradient-primary">
              <Mic className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">VoiceBill Pro</h1>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
            Speech-Recognized
            <span className="text-primary block">Billing System</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-md">
            Revolutionary point-of-sale system with voice recognition technology. 
            Process transactions faster and more accurately than ever before.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
              <Mic className="w-6 h-6 text-primary" />
              <div>
                <div className="font-semibold">Voice Input</div>
                <div className="text-sm text-muted-foreground">Hands-free billing</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
              <ShoppingCart className="w-6 h-6 text-primary" />
              <div>
                <div className="font-semibold">Real-time</div>
                <div className="text-sm text-muted-foreground">Instant processing</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
              <BarChart3 className="w-6 h-6 text-primary" />
              <div>
                <div className="font-semibold">Analytics</div>
                <div className="text-sm text-muted-foreground">Sales insights</div>
              </div>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md mx-auto">
          <Card className="border-border shadow-elegant">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                Access your POS dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    required
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    required
                    className="bg-input border-border"
                  />
                </div>
                
                {error && (
                  <Alert className="border-destructive/50 text-destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  variant="premium"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3 text-center">Demo Credentials:</p>
                <div className="space-y-2">
                  {demoCredentials.map((cred, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center p-2 rounded bg-muted text-xs cursor-pointer hover:bg-muted/80"
                      onClick={() => setCredentials({ username: cred.username, password: cred.password })}
                    >
                      <span className="font-mono">{cred.username}</span>
                      <span className="text-muted-foreground">{cred.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}