import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OrganicTimelinePreview } from '@/components/organic/OrganicTimelinePreview';
import { useServices } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Leaf,
  Zap,
  Clock,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Sun,
  Moon,
  Search,
  X,
  Rocket,
  Sparkles
} from 'lucide-react';
import type { Service } from '@/lib/supabase';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import {
  detectServiceCategory,
  getOrganicConfigForService,
  calculateOptimalRuns,
  getCategoryDisplayInfo,
  type ServiceCategory,
  type OrganicServiceConfig
} from '@/lib/organic-service-config';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionCheckDialog } from '@/components/subscription/SubscriptionCheckDialog';

type DeliveryMode = 'direct' | 'uniform' | 'organic';

interface OrganicPreviewRun {
  runNumber: number;
  scheduledAt: Date;
  quantity: number;
  baseQuantity: number;
  variance: number;
  peakMultiplier: number;
  isPeakHour: boolean;
  // Anti-detection metrics
  sessionType?: 'burst' | 'normal' | 'slow' | 'pause';
  humanBehaviorScore?: number;
  patternBreaker?: boolean;
  hourOfDay?: number;
  dayOfWeek?: number;
}

export default function Order() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, wallet, refreshWallet, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();

  const preselectedService = searchParams.get('service');

  const [selectedServiceId, setSelectedServiceId] = useState<string>(preselectedService || '');
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceList, setShowServiceList] = useState(false);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('organic');

  // Load user preference for organic mode from localStorage
  useEffect(() => {
    try {
      const savedOrganic = localStorage.getItem('organic_settings');
      if (savedOrganic) {
        const parsed = JSON.parse(savedOrganic);
        if (typeof parsed.isOrganicMode === 'boolean') {
          setDeliveryMode(parsed.isOrganicMode ? 'organic' : 'direct');
        }
      }
    } catch { /* ignore */ }
  }, []);
  const [dripRuns, setDripRuns] = useState<number>(20); // Optimized: 20 runs for natural distribution
  const [dripInterval, setDripInterval] = useState<number>(30);
  const [dripIntervalUnit, setDripIntervalUnit] = useState<string>('minutes');
  const [variancePercent, setVariancePercent] = useState<number>(40); // Optimized: 40% for organic look
  const [peakHoursEnabled, setPeakHoursEnabled] = useState<boolean>(false); // OFF by default
  const [organicPreset, setOrganicPreset] = useState<'quick' | 'balanced' | 'ultra'>('balanced');
  // Time Limit: when enabled, AI fits schedule in this duration; when off, AI auto-calculates
  const [timeLimitEnabled, setTimeLimitEnabled] = useState<boolean>(false);
  const [timeLimitValue, setTimeLimitValue] = useState<number>(6);
  const [timeLimitUnit, setTimeLimitUnit] = useState<string>('hours');
  const [error, setError] = useState<string>('');

  const { services } = useServices();

  // Filter services based on search
  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!serviceSearch) return services;

    const query = serviceSearch.toLowerCase();
    return services.filter(s =>
      s.provider_service_id?.toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query) ||
      s.category.toLowerCase().includes(query)
    );
  }, [services, serviceSearch]);

  // Group services by category
  const groupedServices = useMemo(() => {
    const grouped: { [key: string]: Service[] } = {};
    filteredServices.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    });
    return grouped;
  }, [filteredServices]);

  const selectedService = services?.find(s => s.id === selectedServiceId);

  // Auto-detect service category and get optimal organic config
  const detectedCategory = useMemo((): ServiceCategory => {
    if (!selectedService) return 'generic';
    return detectServiceCategory(selectedService.name, selectedService.category);
  }, [selectedService]);

  const organicConfig = useMemo((): OrganicServiceConfig => {
    if (!selectedService) return getOrganicConfigForService('', '');
    return getOrganicConfigForService(selectedService.name, selectedService.category);
  }, [selectedService]);

  const categoryInfo = useMemo(() => getCategoryDisplayInfo(detectedCategory), [detectedCategory]);

  // Calculate price
  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    return (quantity / 1000) * selectedService.price;
  }, [selectedService, quantity]);

  // Get service minimum quantity (default 10 for provider compatibility)
  const serviceMinQty = selectedService?.min_quantity || 10;

  // Calculate optimal number of runs based on service type config
  const effectiveRuns = useMemo(() => {
    // Use service-specific config for optimal runs
    const configRuns = calculateOptimalRuns(quantity, serviceMinQty, organicConfig);

    // User can override with manual setting
    const userRuns = dripRuns;

    // Each run must have at least service minimum
    const maxPossibleRuns = Math.floor(quantity / serviceMinQty);

    // Use the smaller of: config-based runs, user selection, or max possible
    return Math.min(userRuns, configRuns, maxPossibleRuns);
  }, [quantity, dripRuns, serviceMinQty, organicConfig]);

  // Calculate organic preview schedule
  // Advanced Organic Algorithm v5.0 - Service-specific scheduling with TRUE randomness
  const organicPreview = useMemo((): OrganicPreviewRun[] => {
    if (deliveryMode !== 'organic' || !quantity || effectiveRuns < 1) return [];

    const runs: OrganicPreviewRun[] = [];
    let remaining = quantity;
    const now = new Date();

    // Get service-specific config values
    const {
      baseIntervalMinutes,
      intervalVariance,
      quantityVariancePercent,
      spikeChance,
      spikeMagnitude,
      dipChance,
      dipMagnitude,
      burstChance,
      pauseChance,
      patternBreakerChance,
      peakHourBoost,
      nightReduction,
      targetHumanScore,
    } = organicConfig;

    // Calculate interval based on time limit mode OR service config
    let intervalMs: number;

    if (timeLimitEnabled && timeLimitValue > 0) {
      // Time Limit ON: AI fits all runs within specified duration
      const totalDurationMs = timeLimitValue * (
        timeLimitUnit === 'minutes' ? 60000 :
          timeLimitUnit === 'hours' ? 3600000 :
            86400000
      );
      intervalMs = Math.floor(totalDurationMs / effectiveRuns);
    } else {
      // Time Limit OFF: Use service-specific base interval with variance
      const baseInterval = baseIntervalMinutes * 60000; // Convert to ms
      const variance = intervalVariance * 60000; // Convert to ms
      // Apply some randomization to base interval
      intervalMs = baseInterval + (Math.random() * variance * 2 - variance);
    }

    // Use current timestamp for unique seed each load
    const baseSeed = Date.now() % 100000;

    // Seeded random for preview (changes each page load for uniqueness)
    const seededRandom = (seed: number): number => {
      const x = Math.sin((seed + baseSeed) * 9999) * 10000;
      return x - Math.floor(x);
    };

    // Service-specific session types
    const getSessionType = (i: number, total: number): 'burst' | 'normal' | 'slow' | 'pause' => {
      const roll = seededRandom(i * 88888);
      const position = i / total;

      // Use service-specific probabilities
      if (roll < pauseChance) return 'pause';
      if (roll < pauseChance + burstChance) return 'burst';

      // Position-based adjustments
      if (position < 0.2) {
        return roll < 0.5 ? 'slow' : 'normal';
      }
      if (position > 0.8) {
        return roll < 0.4 ? 'slow' : 'normal';
      }

      return seededRandom(i * 77777) > 0.4 ? 'normal' : 'burst';
    };

    // Service-specific time multipliers
    const getTimeMultiplier = (hour: number): { multiplier: number; isPeak: boolean } => {
      if (!peakHoursEnabled) return { multiplier: 1.0, isPeak: false };

      // Use service-specific peak boost
      if (hour >= 20 && hour <= 22) return { multiplier: peakHourBoost, isPeak: true };
      if (hour >= 18 && hour < 20) return { multiplier: peakHourBoost * 0.85, isPeak: true };
      if (hour >= 12 && hour < 14) return { multiplier: 1.3, isPeak: true };
      if (hour >= 9 && hour < 12) return { multiplier: 1.0, isPeak: false };
      if (hour >= 14 && hour < 18) return { multiplier: 0.8, isPeak: false };
      if (hour >= 6 && hour < 9) return { multiplier: 0.7, isPeak: false };
      // Night reduction from service config
      if (hour >= 22 || hour < 2) return { multiplier: nightReduction, isPeak: false };
      return { multiplier: nightReduction * 0.8, isPeak: false };
    };

    // Service-specific human score calculation
    const getHumanScore = (variance: number, sessionType: string, patternBreaker: boolean): number => {
      let score = targetHumanScore[0]; // Start with min target

      // Variance adds to score
      const varianceRatio = Math.abs(variance) / serviceMinQty;
      score += Math.min(25, varianceRatio * 12);

      // Session type affects score
      if (sessionType === 'burst') score += 5;
      if (sessionType === 'slow') score += 12;
      if (sessionType === 'pause') score += 18;

      // Pattern breakers are highly human
      if (patternBreaker) score += 15;

      return Math.min(targetHumanScore[1], Math.max(targetHumanScore[0], score));
    };

    // First pass: calculate base quantities with service-specific variance
    const baseQuantities: number[] = [];
    let totalBase = 0;

    for (let i = 0; i < effectiveRuns; i++) {
      // Random multiplier based on service variance config
      const varianceRange = quantityVariancePercent / 50; // Normalize to 0-1+ range
      const randomMult = (1 - varianceRange * 0.7) + seededRandom(i * 12345) * varianceRange * 1.4;

      // S-curve weight
      const x = i / effectiveRuns;
      let sCurve = 1.0;
      if (x < 0.2) sCurve = 0.6 + x * 2;
      else if (x < 0.6) sCurve = 1.0 + (x - 0.2) * 0.5;
      else sCurve = 1.2 - (x - 0.6) * 1.5;

      // Service-specific spike/dip chances
      let spikeMult = 1.0;
      const spikeRoll = seededRandom(i * 54321);
      if (spikeRoll > (1 - spikeChance)) {
        // Spike: use service-specific magnitude
        spikeMult = spikeMagnitude[0] + seededRandom(i * 11111) * (spikeMagnitude[1] - spikeMagnitude[0]);
      } else if (spikeRoll < dipChance) {
        // Dip: use service-specific magnitude
        spikeMult = dipMagnitude[0] + seededRandom(i * 22222) * (dipMagnitude[1] - dipMagnitude[0]);
      }

      const baseQty = randomMult * sCurve * spikeMult;
      baseQuantities.push(baseQty);
      totalBase += baseQty;
    }

    // Second pass: normalize to total quantity while respecting minimum
    for (let i = 0; i < effectiveRuns; i++) {
      const scheduledAt = new Date(now.getTime() + (i * intervalMs));

      // Add random offset based on service interval variance (±variance minutes)
      const offsetRange = intervalVariance * 60000;
      const randomOffset = Math.floor((seededRandom(i * 77777) * 2 - 1) * offsetRange);
      scheduledAt.setTime(scheduledAt.getTime() + randomOffset);

      const hour = scheduledAt.getHours();
      const { multiplier, isPeak } = getTimeMultiplier(hour);
      const sessionType = getSessionType(i, effectiveRuns);

      // Service-specific pattern breaker chance
      const patternBreaker = seededRandom(i * 99999) > (1 - patternBreakerChance);

      let qty: number;
      if (i === effectiveRuns - 1) {
        // Last run gets remaining
        qty = Math.max(serviceMinQty, remaining);
      } else {
        // Proportional distribution
        qty = Math.round((baseQuantities[i] / totalBase) * quantity);

        // Apply time multiplier
        qty = Math.round(qty * (0.7 + multiplier * 0.3));

        // Ensure minimum and don't exceed remaining
        const runsLeft = effectiveRuns - i;
        const minNeededForRemaining = (runsLeft - 1) * serviceMinQty;
        qty = Math.max(serviceMinQty, Math.min(qty, remaining - minNeededForRemaining));

        // Pattern breaker: either spike or dip dramatically
        if (patternBreaker) {
          const breakerRoll = seededRandom(i * 33333);
          if (breakerRoll > 0.5) {
            qty = Math.min(remaining - minNeededForRemaining, Math.round(qty * (1.5 + breakerRoll)));
          } else {
            qty = Math.max(serviceMinQty, Math.round(qty * (0.4 + breakerRoll * 0.3)));
          }
        }
      }

      remaining -= qty;

      const avgQty = Math.floor(quantity / effectiveRuns);
      const variance = qty - avgQty;
      const humanScore = getHumanScore(variance, sessionType, patternBreaker);

      runs.push({
        runNumber: i + 1,
        scheduledAt,
        quantity: qty,
        baseQuantity: avgQty,
        variance,
        peakMultiplier: multiplier,
        isPeakHour: isPeak,
        sessionType,
        humanBehaviorScore: humanScore,
        patternBreaker,
        hourOfDay: hour,
        dayOfWeek: scheduledAt.getDay(),
      });
    }

    return runs;
  }, [quantity, effectiveRuns, dripInterval, dripIntervalUnit, variancePercent, peakHoursEnabled, deliveryMode, serviceMinQty, timeLimitEnabled, timeLimitValue, timeLimitUnit, organicConfig]);

  // Calculate max bar height for chart
  const maxQuantity = Math.max(...organicPreview.map(r => r.quantity), 1);

  // State for processing
  const [isProcessing, setIsProcessing] = useState(false);

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedService || !link || !user) {
        throw new Error('Missing required fields');
      }

      if (!wallet || wallet.balance < totalPrice) {
        throw new Error('Insufficient balance');
      }

      setIsProcessing(true);

      // Build order data
      const orderData: any = {
        service_id: selectedService.id,
        link,
        quantity,
        price: totalPrice,
        status: 'pending',
        is_drip_feed: deliveryMode !== 'direct',
        drip_runs: deliveryMode !== 'direct' ? effectiveRuns : null,
        drip_interval: deliveryMode !== 'direct' ? dripInterval : null,
        drip_interval_unit: deliveryMode !== 'direct' ? dripIntervalUnit : null,
        drip_quantity_per_run: deliveryMode !== 'direct' ? Math.floor(quantity / effectiveRuns) : null,
        is_organic_mode: deliveryMode === 'organic',
        variance_percent: deliveryMode === 'organic' ? variancePercent : 25,
        peak_hours_enabled: deliveryMode === 'organic' ? peakHoursEnabled : false,
        service_name: selectedService.name,
      };

      // Build runs if organic mode
      let runs: any[] | undefined;
      if (deliveryMode === 'organic') {
        const submissionTime = new Date();
        const initialDelayMs = (2 + Math.random() * 3) * 60000;
        const startTime = new Date(submissionTime.getTime() + initialDelayMs);

        let baseIntervalMs: number;
        if (timeLimitEnabled && timeLimitValue > 0) {
          const totalDurationMs = timeLimitValue * (
            timeLimitUnit === 'minutes' ? 60000 :
              timeLimitUnit === 'hours' ? 3600000 :
                86400000
          );
          baseIntervalMs = Math.floor(totalDurationMs / organicPreview.length);
        } else {
          baseIntervalMs = organicConfig.baseIntervalMinutes * 60000;
        }

        runs = organicPreview.map((run, index) => {
          const newScheduledAt = new Date(startTime.getTime() + (index * baseIntervalMs));
          const timeVariance = (Math.random() * 4 - 2) * 60000;
          newScheduledAt.setTime(newScheduledAt.getTime() + timeVariance);

          return {
            run_number: run.runNumber,
            scheduled_at: newScheduledAt.toISOString(),
            quantity_to_send: run.quantity,
            base_quantity: run.baseQuantity,
            variance_applied: run.variance,
            peak_multiplier: run.peakMultiplier,
            status: 'pending',
          };
        });
      }

      // Call server-side function for secure wallet deduction
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: { orderData, totalPrice, runs },
      });

      if (error) throw new Error(error.message || 'Failed to place order');
      if (data?.error) throw new Error(data.error);

      toast.success('🚀 Order placed successfully!');
      refreshWallet();

      return data;
    },
    onSuccess: (order) => {
      setIsProcessing(false);
      // Navigate instantly - don't wait for provider
      navigate(`/orders`);
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      setError(error.message);
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation first
    if (!selectedServiceId) {
      setError('Please select a service');
      return;
    }
    if (!link) {
      setError('Please enter a link');
      return;
    }
    if (quantity < (selectedService?.min_quantity || 10)) {
      setError(`Minimum quantity is ${selectedService?.min_quantity}`);
      return;
    }
    if (quantity > (selectedService?.max_quantity || 100000)) {
      setError(`Maximum quantity is ${selectedService?.max_quantity}`);
      return;
    }

    // Admin bypasses all checks - free access
    if (isAdmin) {
      placeOrderMutation.mutate();
      return;
    }


    // STEP 2: After subscription confirmed, check balance
    if (!wallet || wallet.balance <= 0) {
      toast.error('आपके account में कोई balance नहीं है। पहले funds add करें!');
      navigate('/wallet');
      return;
    }

    if (wallet.balance < totalPrice) {
      toast.error(`Insufficient balance! Your wallet has ${formatPrice(wallet.balance)}. Order requires ${formatPrice(totalPrice)}.`);
      navigate('/wallet');
      return;
    }

    placeOrderMutation.mutate();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-8">
        {/* Header with gradient */}
        <div className="relative overflow-hidden glass-card p-6 sm:p-8 bg-gradient-to-r from-primary/5 via-transparent to-success/5">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <Leaf className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">New Order</h1>
                <p className="text-sm text-muted-foreground">Organic delivery system powered by AI</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Order Form - Takes 3 columns */}
          <div className="lg:col-span-3 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Service Select Card */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-foreground">
                  <Search className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Select Service</Label>
                </div>

                {/* Search Input */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search by ID (e.g., 513) or name..."
                    value={serviceSearch}
                    onChange={(e) => {
                      setServiceSearch(e.target.value);
                      setShowServiceList(true);
                    }}
                    onFocus={() => setShowServiceList(true)}
                    className="pl-11 pr-11 h-12 text-base rounded-xl border-2 border-border focus:border-primary bg-background/50 transition-all"
                  />
                  {serviceSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setServiceSearch('');
                        setShowServiceList(false);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Selected Service Display */}
                {selectedService && !showServiceList && (
                  <div
                    onClick={() => setShowServiceList(true)}
                    className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-mono text-sm bg-primary/20 text-primary px-3 py-1 rounded-lg shrink-0 font-bold">
                          #{selectedService.provider_service_id}
                        </span>
                        <span className="text-sm sm:text-base font-medium truncate">{selectedService.name}</span>
                      </div>
                      <span className="text-lg font-bold text-primary shrink-0">{formatPrice(selectedService.price)}<span className="text-sm text-muted-foreground font-normal">/1K</span></span>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-3">
                      <span className="bg-secondary px-2 py-1 rounded-md">Min: {selectedService.min_quantity.toLocaleString()}</span>
                      <span className="bg-secondary px-2 py-1 rounded-md">Max: {selectedService.max_quantity.toLocaleString()}</span>
                      {selectedService.drip_feed_enabled && <span className="bg-success/20 text-success px-2 py-1 rounded-md">✓ Drip</span>}
                    </div>

                    {/* AI-Detected Service Type Badge */}
                    {deliveryMode === 'organic' && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-success" />
                          <span className="text-xs text-muted-foreground">AI Organic Mode:</span>
                          <span className={`text-xs font-bold ${categoryInfo.color}`}>
                            {categoryInfo.emoji} {categoryInfo.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {organicConfig.description}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Service List */}
                {showServiceList && (
                  <div className="border-2 border-border rounded-xl bg-card overflow-hidden shadow-lg">
                    <ScrollArea className="h-[280px] sm:h-[320px]">
                      {Object.keys(groupedServices).length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>{serviceSearch ? 'No services found' : 'No services available'}</p>
                        </div>
                      ) : (
                        Object.entries(groupedServices).map(([category, categoryServices]) => (
                          <div key={category}>
                            <div className="sticky top-0 px-4 py-2.5 bg-secondary text-xs font-bold text-foreground uppercase tracking-wide backdrop-blur z-10 border-b border-border">
                              {category}
                            </div>
                            {categoryServices.map((service) => (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => {
                                  setSelectedServiceId(service.id);
                                  setQuantity(Math.max(quantity, service.min_quantity));
                                  setShowServiceList(false);
                                  setServiceSearch('');
                                }}
                                className={`w-full p-4 text-left hover:bg-primary/5 transition-all border-b border-border/50 ${selectedServiceId === service.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                                  }`}
                              >
                                <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded-md shrink-0 font-semibold">
                                        #{service.provider_service_id}
                                      </span>
                                      <span className="text-sm font-medium line-clamp-2">{service.name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                                      <span>Min: {service.min_quantity}</span>
                                      <span>•</span>
                                      <span>Max: {service.max_quantity.toLocaleString()}</span>
                                      {service.drip_feed_enabled && <span className="text-success font-medium">• Drip ✓</span>}
                                    </div>
                                  </div>
                                  <div className="text-left sm:text-right shrink-0">
                                    <p className="text-lg font-bold text-primary">{formatPrice(service.price)}</p>
                                    <p className="text-xs text-muted-foreground">per 1K</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </ScrollArea>
                    {filteredServices.length > 0 && (
                      <div className="px-4 py-2.5 border-t-2 border-border bg-muted/50 text-xs text-muted-foreground text-center font-medium">
                        {filteredServices.length} services found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Link & Quantity Card */}
              <div className="glass-card p-5 space-y-5">
                {/* Link Input */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    <Label className="text-base font-semibold">Target Link</Label>
                  </div>
                  <div className="relative group">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="https://instagram.com/p/..."
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="pl-11 h-12 text-base rounded-xl border-2 border-border focus:border-primary bg-background/50 transition-all"
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Quantity</Label>
                    {selectedService && (
                      <span className="text-xs text-muted-foreground">
                        {selectedService.min_quantity.toLocaleString()} - {selectedService.max_quantity.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="h-12 text-lg font-semibold rounded-xl border-2 border-border focus:border-primary bg-background/50 transition-all text-center"
                      min={selectedService?.min_quantity || 10}
                      max={selectedService?.max_quantity || 100000}
                    />
                  </div>
                  {/* Quick Quantity Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[1000, 5000, 10000, 25000, 50000].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setQuantity(qty)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${quantity === qty
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary hover:bg-secondary/80 text-foreground'
                          }`}
                      >
                        {qty >= 1000 ? `${qty / 1000}K` : qty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Mode Card */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Delivery Mode</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'direct', icon: Zap, label: 'Direct', desc: 'Instant delivery', color: 'primary' },
                    { id: 'uniform', icon: Clock, label: 'Uniform', desc: 'Same qty/run', color: 'primary' },
                    { id: 'organic', icon: Leaf, label: 'Organic', desc: 'Natural growth', color: 'success' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDeliveryMode(mode.id as DeliveryMode)}
                      className={`relative p-4 rounded-xl border-2 text-center transition-all duration-300 ${deliveryMode === mode.id
                        ? mode.id === 'organic'
                          ? 'border-success bg-success/10 shadow-lg shadow-success/20'
                          : 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                        : 'border-border bg-card hover:border-primary/30 hover:bg-secondary/50'
                        }`}
                    >
                      {mode.id === 'organic' && deliveryMode === 'organic' && (
                        <div className="absolute -top-2 -right-2 bg-success text-[10px] text-success-foreground px-2 py-0.5 rounded-full font-bold">
                          ⭐ BEST
                        </div>
                      )}
                      <mode.icon className={`h-7 w-7 mx-auto mb-2 ${deliveryMode === mode.id
                        ? mode.id === 'organic' ? 'text-success' : 'text-primary'
                        : 'text-muted-foreground'
                        }`} />
                      <p className={`font-semibold text-sm ${deliveryMode === mode.id
                        ? mode.id === 'organic' ? 'text-success' : 'text-primary'
                        : 'text-foreground'
                        }`}>{mode.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drip Settings (for uniform and organic) */}
              {deliveryMode !== 'direct' && (
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <Label className="text-base font-semibold">Schedule Settings</Label>
                  </div>

                  {/* Time Limit Toggle - Only for Organic mode */}
                  {deliveryMode === 'organic' && (
                    <div className="p-4 rounded-xl bg-card border-2 border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Time Limit</p>
                            <p className="text-xs text-muted-foreground">
                              {timeLimitEnabled
                                ? 'AI fits schedule within this time'
                                : 'AI decides optimal duration'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={timeLimitEnabled}
                          onCheckedChange={setTimeLimitEnabled}
                        />
                      </div>

                      {/* Time Limit Input - shown when enabled */}
                      {timeLimitEnabled && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Input
                            type="number"
                            value={timeLimitValue}
                            onChange={(e) => setTimeLimitValue(Math.max(1, Number(e.target.value)))}
                            className="h-11 rounded-xl border-2 border-primary/30 focus:border-primary bg-background/50 flex-1 text-center font-semibold"
                            min={1}
                          />
                          <Select value={timeLimitUnit} onValueChange={setTimeLimitUnit}>
                            <SelectTrigger className="w-24 sm:w-28 h-11 rounded-xl border-2 border-primary/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Min</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Number of Runs</Label>
                      <Input
                        type="number"
                        value={dripRuns}
                        onChange={(e) => setDripRuns(Math.max(2, Math.min(100, Number(e.target.value))))}
                        className="h-11 rounded-xl border-2 border-border focus:border-primary bg-background/50 text-center font-semibold"
                        min={2}
                        max={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        {timeLimitEnabled ? 'Interval (auto-calculated)' : 'Interval Between Runs'}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={dripInterval}
                          onChange={(e) => setDripInterval(Number(e.target.value))}
                          className="h-11 rounded-xl border-2 border-border focus:border-primary bg-background/50 flex-1 text-center font-semibold"
                          min={1}
                          disabled={timeLimitEnabled}
                        />
                        <Select value={dripIntervalUnit} onValueChange={setDripIntervalUnit} disabled={timeLimitEnabled}>
                          <SelectTrigger className="w-24 sm:w-28 h-11 rounded-xl border-2 border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Min</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Organic Settings */}
              {deliveryMode === 'organic' && (
                <div className="glass-card p-5 space-y-5 border-2 border-success/30 bg-gradient-to-br from-success/5 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                        <Leaf className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <span className="font-bold text-success">Organic Growth Settings</span>
                        <p className="text-xs text-muted-foreground">AI-optimized for {categoryInfo.label.toLowerCase()}</p>
                      </div>
                    </div>
                    {/* Service Type Badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
                      <Sparkles className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold">{categoryInfo.emoji} {categoryInfo.label}</span>
                    </div>
                  </div>

                  {/* AI-Detected Config Summary */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-success/5 to-primary/5 border border-success/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-success" />
                      <span className="text-sm font-bold text-success">AI Service Profile</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="text-center p-2 rounded-lg bg-card/50">
                        <p className="font-bold text-foreground">{organicConfig.baseIntervalMinutes}m</p>
                        <p className="text-muted-foreground">Base Interval</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-card/50">
                        <p className="font-bold text-foreground">{Math.round(organicConfig.spikeChance * 100)}%</p>
                        <p className="text-muted-foreground">Spike Chance</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-card/50">
                        <p className="font-bold text-foreground">{organicConfig.peakHourBoost}x</p>
                        <p className="text-muted-foreground">Peak Boost</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-card/50">
                        <p className="font-bold text-foreground">{organicConfig.targetHumanScore[0]}-{organicConfig.targetHumanScore[1]}</p>
                        <p className="text-muted-foreground">Human Score</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center italic">
                      {organicConfig.description}
                    </p>
                  </div>

                  {/* Preset Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Delivery Speed Preset</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'quick', label: 'Quick', desc: '2-4 hours', runs: 12, interval: 15, variance: 30, emoji: '⚡' },
                        { id: 'balanced', label: 'Balanced', desc: '6-12 hours', runs: 20, interval: 30, variance: 40, emoji: '⭐' },
                        { id: 'ultra', label: 'Ultra', desc: '24-48 hours', runs: 50, interval: 45, variance: 50, emoji: '🛡️' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setOrganicPreset(preset.id as 'quick' | 'balanced' | 'ultra');
                            setDripRuns(preset.runs);
                            setDripInterval(preset.interval);
                            setVariancePercent(preset.variance);
                          }}
                          className={`p-4 rounded-xl border-2 text-center transition-all duration-300 ${organicPreset === preset.id
                            ? 'border-success bg-success/15 shadow-md shadow-success/20'
                            : 'border-border bg-card hover:border-success/40'
                            }`}
                        >
                          <span className="text-xl mb-1 block">{preset.emoji}</span>
                          <p className={`font-bold text-sm ${organicPreset === preset.id ? 'text-success' : ''}`}>{preset.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{preset.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Runs Adjustment Warning */}
                  {effectiveRuns < dripRuns && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <span className="text-sm">
                        Runs adjusted to <strong>{effectiveRuns}</strong> (min {serviceMinQty} views per run)
                      </span>
                    </div>
                  )}

                  <div className="space-y-5 pt-4 border-t border-border/50">
                    {/* Variance Slider */}
                    <div className="space-y-3 p-4 rounded-xl bg-card border border-border">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Random Variance</Label>
                        <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded-lg font-bold">±{variancePercent}%</span>
                      </div>
                      <Slider
                        value={[variancePercent]}
                        onValueChange={([v]) => setVariancePercent(v)}
                        min={20}
                        max={55}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher = more natural look (recommended: 35-50%)
                      </p>
                    </div>

                    {/* Peak Hours Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                          <Sun className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">Peak Hour Boost</p>
                          <p className="text-xs text-muted-foreground">1.8x during 8-10 PM prime time</p>
                        </div>
                      </div>
                      <Switch
                        checked={peakHoursEnabled}
                        onCheckedChange={setPeakHoursEnabled}
                      />
                    </div>

                    {/* Organic Features Grid */}
                    <div className="p-4 rounded-xl bg-success/10 border border-success/20 space-y-3">
                      <p className="text-sm font-bold text-success flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Active Organic Features
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {['S-Curve Distribution', 'Random Time Offsets', 'Viral Spike Simulation', 'Natural Dip Moments', 'Time-Zone Optimization', 'Dead Hour Avoidance'].map((feature) => (
                          <span key={feature} className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Detection Risk Indicator */}
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Detection Risk Level</span>
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${variancePercent >= 40 && dripRuns >= 15 ? 'bg-success/20 text-success' :
                          variancePercent >= 30 && dripRuns >= 10 ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'
                          }`}>
                          {variancePercent >= 40 && dripRuns >= 15 ? '✓ Very Low' :
                            variancePercent >= 30 && dripRuns >= 10 ? '⚠ Low' : '⚠ Medium'}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${variancePercent >= 40 && dripRuns >= 15 ? 'bg-success' :
                            variancePercent >= 30 && dripRuns >= 10 ? 'bg-warning' : 'bg-destructive'
                            }`}
                          style={{ width: `${Math.max(10, 100 - (variancePercent * 1.5 + dripRuns * 1.5))}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {variancePercent >= 40 && dripRuns >= 15
                          ? '100% undetectable organic pattern'
                          : 'Increase runs or variance for better safety'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Price Summary Card */}
              <div className="glass-card p-5 bg-gradient-to-br from-primary/5 to-transparent border-2 border-primary/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Service Price</span>
                    <span className="font-medium">{formatPrice(selectedService?.price || 0)}/1K</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-medium">{quantity.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-3xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <span>Current Balance: {formatPrice(wallet?.balance || 0)}</span>
                    <span>After Order: {formatPrice((wallet?.balance || 0) - totalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300"
                disabled={placeOrderMutation.isPending || !selectedServiceId || !link}
              >
                {placeOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing Order...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5 mr-2" />
                    Place Order — {formatPrice(totalPrice)}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Live Preview - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-5">
            {/* Organic Timeline Preview - New Design */}
            {deliveryMode === 'organic' && organicPreview.length > 0 && (
              <OrganicTimelinePreview
                runs={organicPreview}
                totalQuantity={quantity}
              />
            )}

            {/* Organic Preview Chart */}
            {deliveryMode === 'organic' && organicPreview.length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                    <Leaf className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h3 className="font-bold">Growth Curve Preview</h3>
                    <p className="text-xs text-muted-foreground">Visualizing your organic delivery pattern</p>
                  </div>
                </div>

                {/* Chart */}
                <div className="mb-5 bg-secondary/30 p-4 rounded-xl">
                  <div className="flex items-end gap-0.5 h-32 sm:h-40">
                    {organicPreview.map((run, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center justify-end"
                      >
                        <div
                          className={`w-full rounded-t-sm transition-all duration-500 min-w-[2px] ${run.isPeakHour ? 'bg-gradient-to-t from-warning to-warning/50' : 'bg-gradient-to-t from-success to-success/50'
                            }`}
                          style={{
                            height: `${Math.max(5, (run.quantity / maxQuantity) * 100)}%`,
                            animationDelay: `${i * 50}ms`
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-muted-foreground font-medium">
                    <span>{formatTime(organicPreview[0]?.scheduledAt || new Date())}</span>
                    <span>→ {formatTime(organicPreview[organicPreview.length - 1]?.scheduledAt || new Date())}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-xs mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-muted-foreground">Regular</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span className="text-muted-foreground">Peak Hour</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                  <div className="text-center p-3 rounded-xl bg-secondary/50">
                    <p className="text-xl sm:text-2xl font-bold text-primary">{effectiveRuns}</p>
                    <p className="text-xs text-muted-foreground">Total Runs</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-secondary/50">
                    <p className="text-xl sm:text-2xl font-bold text-success">±{variancePercent}%</p>
                    <p className="text-xs text-muted-foreground">Variance</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-secondary/50">
                    <p className="text-xl sm:text-2xl font-bold text-warning">
                      {peakHoursEnabled ? '1.8x' : 'OFF'}
                    </p>
                    <p className="text-xs text-muted-foreground">Peak Boost</p>
                  </div>
                </div>
              </div>
            )}

            {/* Run Schedule Table */}
            {deliveryMode === 'organic' && organicPreview.length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Scheduled Runs</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium">
                    {organicPreview.length} runs
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2">
                  {organicPreview.slice(0, 10).map((run) => (
                    <div
                      key={run.runNumber}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center font-mono text-xs font-bold">
                          #{run.runNumber}
                        </span>
                        <div>
                          <p className="font-medium text-sm">
                            {run.scheduledAt.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {run.isPeakHour && (
                              <span className="text-warning mr-2">🔥 Peak</span>
                            )}
                            {run.variance >= 0 ? '+' : ''}{run.variance} variance
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success text-lg">{run.quantity.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {run.peakMultiplier !== 1 && `${run.peakMultiplier}x boost`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {organicPreview.length > 10 && (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      + {organicPreview.length - 10} more runs...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comparison Chart */}
            {deliveryMode === 'organic' && (
              <div className="glass-card p-5">
                <h3 className="font-bold mb-4">Organic vs Traditional</h3>
                <div className="space-y-5">
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50" />
                      Traditional (Flat/Robotic Pattern)
                    </p>
                    <div className="flex items-end gap-0.5 h-10">
                      {Array(Math.min(effectiveRuns, 30)).fill(0).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-muted-foreground/30 rounded-t min-w-[2px]"
                          style={{ height: '60%' }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10">
                    <p className="text-xs text-success mb-2 flex items-center gap-2 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-success" />
                      Your Organic Order (Natural Growth)
                    </p>
                    <div className="flex items-end gap-0.5 h-10">
                      {organicPreview.slice(0, 30).map((run, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-success rounded-t min-w-[2px]"
                          style={{ height: `${Math.max(10, (run.quantity / maxQuantity) * 100)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder when no organic mode */}
            {deliveryMode !== 'organic' && (
              <div className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Leaf className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">Organic Mode Disabled</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Select "Organic" delivery mode to see the growth curve preview and schedule visualization.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeliveryMode('organic')}
                  className="mt-4"
                >
                  <Leaf className="h-4 w-4 mr-2" />
                  Enable Organic Mode
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}
