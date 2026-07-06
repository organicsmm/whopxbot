import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubscriptionRequestDialog } from './SubscriptionRequestDialog';
import {
  Lock,
  Zap,
  Crown,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Bitcoin,
  Loader2,
} from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { hasActiveSubscription, hasPendingRequest, isLoading } = useSubscription();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [cryptoLoading, setCryptoLoading] = useState(false);

  async function payWithCrypto() {
    setCryptoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('oxapay-create-subscription', {
        body: { plan: selectedPlan },
      });
      if (error) throw error;
      if (!data?.payment_url) throw new Error(data?.error || 'No payment URL');
      window.location.href = data.payment_url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not start crypto payment');
      setCryptoLoading(false);
    }
  }

  // If loading, show nothing to prevent flash
  if (isLoading) {
    return <>{children}</>;
  }

  // If has active subscription, show children
  if (hasActiveSubscription) {
    return <>{children}</>;
  }

  // Show subscription required UI
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="glass-card max-w-2xl w-full">
        <CardContent className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Subscription Required</h2>
            <p className="text-muted-foreground">
              Choose a plan to unlock all features and start placing orders.
            </p>
          </div>

          {/* Pending Request Notice */}
          {hasPendingRequest && (
            <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-warning">Request Pending</p>
                  <p className="text-sm text-muted-foreground">
                    Your subscription request is being reviewed. We'll contact you soon!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          {!hasPendingRequest && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {/* Monthly */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                onClick={() => setSelectedPlan('monthly')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  {selectedPlan === 'monthly' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <h3 className="font-semibold mb-1">Monthly</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold">$15</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground">30 days access</p>
              </div>

              {/* Yearly - Popular */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${selectedPlan === 'yearly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                onClick={() => setSelectedPlan('yearly')}
              >
                <Badge className="absolute top-1.5 right-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-[10px]">
                  Popular
                </Badge>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                  </div>
                  {selectedPlan === 'yearly' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <h3 className="font-semibold mb-1">Yearly</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold">$99</span>
                  <span className="text-xs text-muted-foreground">/yr</span>
                </div>
                <p className="text-xs text-emerald-600 font-semibold">Save 54%</p>
              </div>

              {/* Lifetime */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${selectedPlan === 'lifetime' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                onClick={() => setSelectedPlan('lifetime')}
              >
                <Badge className="absolute top-1.5 right-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px]">
                  Best
                </Badge>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Crown className="h-4 w-4 text-amber-500" />
                  </div>
                  {selectedPlan === 'lifetime' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <h3 className="font-semibold mb-1">Lifetime</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold">$250</span>
                  <span className="text-xs text-muted-foreground">1x</span>
                </div>
                <p className="text-xs text-amber-600 font-semibold">Forever</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!hasPendingRequest && (
            <div className="space-y-3">
              <Button
                disabled={cryptoLoading}
                onClick={payWithCrypto}
                className="w-full btn-gradient rounded-full py-6 text-lg"
              >
                {cryptoLoading ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Opening OxaPay…</>
                ) : (
                  <><Bitcoin className="h-5 w-5 mr-2" /> Pay with Crypto — {selectedPlan === 'monthly' ? '$15' : selectedPlan === 'yearly' ? '$99' : '$250'}</>
                )}
              </Button>
            </div>
          )}

          {/* Back Link */}
          <div className="text-center mt-4">
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>

      <SubscriptionRequestDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        planType={selectedPlan === 'yearly' ? 'lifetime' : selectedPlan}
      />

    </div>
  );
}
