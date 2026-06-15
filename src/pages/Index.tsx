import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Zap, Shield, BarChart3, CheckCircle2, Shuffle, Clock, Moon, Timer, Eye, ChevronRight, FileText, Lock, HelpCircle, Mail, Code2, Activity, Sparkles, Star } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { PageMeta } from '@/components/seo/PageMeta';

// Brand palette — warm terracotta + sage
const C = {
  bg: '#FAF8F5',
  ink: '#2A2418',
  ink2: '#5B5448',
  muted: '#8A8378',
  line: 'rgba(42,36,24,.08)',
  card: '#FFFFFF',
  orange: '#C97A52',
  orangeDeep: '#4A6741',
  peach: '#F3EDE2',
  soft: '0 1px 2px rgba(42,36,24,.04), 0 8px 24px rgba(42,36,24,.06)',
  softLg: '0 2px 4px rgba(42,36,24,.05), 0 24px 60px rgba(74,103,65,.12)',
};

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold"
    style={{ background: C.peach, color: C.orangeDeep, border: `1px solid rgba(74,103,65,.18)` }}>
    {children}
  </span>
);

const Index = () => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: C.bg, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PageMeta
        title="Grinzo — Organic Social Media Growth Platform"
        description="Revolutionary organic social media growth with natural delivery patterns. 100% safe for your accounts."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* Subtle background glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(74,103,65,.18), transparent 70%)', filter: 'blur(20px)' }} />
        <div className="absolute top-[40%] -right-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(167,200,156,.18), transparent 70%)', filter: 'blur(20px)' }} />
      </div>

      {/* ═══ NAV ═══ */}
      <nav className="sticky top-3 z-50 w-full px-3 sm:px-4">
        <div className="max-w-6xl mx-auto rounded-2xl flex items-center justify-between h-14 px-3 sm:px-4"
          style={{ background: 'rgba(255,255,255,.78)', backdropFilter: 'blur(18px) saturate(160%)', border: `1px solid ${C.line}`, boxShadow: C.soft }}>
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl opacity-60 blur-md transition-opacity group-hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${C.orange}, #cdddc4)` }} />
              <img src={logo} alt="Grinzo" className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover bg-white"
                style={{ border: '1.5px solid white', boxShadow: C.soft }} />
            </div>
            <div className="flex items-center gap-2 leading-none">
              <span className="text-[15px] sm:text-[16px] font-extrabold tracking-tight" style={{ color: C.ink }}>Grinzo</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-[3px] rounded-md"
                style={{ background: C.peach, color: C.orangeDeep }}>v2.0</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {['Features', 'How it works', 'Pricing', 'Why us'].map((t, i) => (
              <a key={t} href={['#features', '#how-it-works', '#pricing', '#comparison'][i]}
                className="text-[13px] font-medium transition-colors hover:opacity-100" style={{ color: C.ink2 }}>
                {t}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex h-9 px-3.5 items-center text-[13px] font-semibold rounded-xl transition-colors"
              style={{ color: C.ink2 }}>
              Sign in
            </Link>
            <Link to="/auth" className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl text-[12.5px] sm:text-[13px] font-semibold text-white inline-flex items-center gap-1.5"
              style={{ background: C.ink, boxShadow: C.soft }}>
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-14 sm:pt-20 lg:pt-28 pb-12 sm:pb-16 text-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6">
            <Pill>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: C.orange }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: C.orange }} />
              </span>
              v2.0 — World's first AI-organic panel
            </Pill>
          </div>

          <h1 className="text-[2.4rem] sm:text-5xl lg:text-[4.5rem] font-black leading-[1.04] tracking-[-0.035em] mb-5"
            style={{ color: C.ink, fontFamily: "'Outfit', 'Inter', system-ui, sans-serif" }}>
            Organic growth,<br className="hidden sm:block" />
            <span className="relative inline-block">
              <span style={{ background: `linear-gradient(135deg, ${C.orange}, #87A878)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                made beautifully simple.
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none">
                <path d="M2 6 Q 80 1, 160 5 T 298 5" stroke={C.orange} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.45" />
              </svg>
            </span>
          </h1>

          <p className="text-[15px] sm:text-[17.5px] leading-[1.65] mb-9 max-w-xl mx-auto" style={{ color: C.ink2 }}>
            Natural delivery patterns that look, feel and behave like real people.
            100% safe for your accounts — zero bans, ever.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link to="/auth" className="w-full sm:w-auto h-12 px-7 rounded-xl text-[14.5px] font-semibold text-white flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDeep})`, boxShadow: '0 10px 30px rgba(74,103,65,.35)' }}>
              <Sparkles className="w-4 h-4" /> Start growing free
            </Link>
            <Link to="/auth" className="w-full sm:w-auto h-12 px-7 rounded-xl text-[14.5px] font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ color: C.ink, background: C.card, border: `1px solid ${C.line}`, boxShadow: C.soft }}>
              View services <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap text-[12px] sm:text-[13px] font-medium" style={{ color: C.muted }}>
            {['No credit card', 'All features included', 'Setup in seconds'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#5e8a5c' }} /> {t}</span>
            ))}
          </div>

          {/* social proof bar */}
          <div className="mt-12 flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" style={{ color: '#FFB400' }} />)}
              <span className="text-[12.5px] font-semibold ml-1" style={{ color: C.ink }}>4.9/5</span>
              <span className="text-[12px]" style={{ color: C.muted }}>· 2,400+ creators</span>
            </div>
            <span className="hidden sm:inline-block w-px h-5" style={{ background: C.line }} />
            <span className="text-[12.5px] font-medium" style={{ color: C.ink2 }}>
              <strong style={{ color: C.ink }}>50,000+</strong> orders delivered
            </span>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ROW ═══ */}
      <section id="features" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <Pill><Zap className="w-3 h-3" /> Features no other panel has</Pill>
            <h2 className="mt-4 text-[1.75rem] sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight"
              style={{ color: C.ink, fontFamily: "'Outfit', system-ui" }}>
              Engineered to look <span style={{ color: C.orange }}>perfectly natural</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { icon: TrendingUp, title: 'S-Curve Pattern', desc: 'Natural viral growth simulation' },
              { icon: Shuffle, title: '±50% Variance', desc: 'Random qty each delivery' },
              { icon: Clock, title: 'Peak Hour Boost', desc: '1.5x during 6–10 PM IST' },
              { icon: Moon, title: 'Night Slowdown', desc: 'Realistic sleep patterns' },
              { icon: Timer, title: '±5min Jitter', desc: 'Anti-detection timing' },
              { icon: Eye, title: 'Live Preview', desc: 'See delivery before order' },
            ].map((f) => (
              <div key={f.title} className="group rounded-2xl p-4 sm:p-5 text-center transition-all hover:-translate-y-1"
                style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.soft }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2.5 transition-colors group-hover:scale-105"
                  style={{ background: C.peach }}>
                  <f.icon className="w-4.5 h-4.5" style={{ color: C.orangeDeep, width: 18, height: 18 }} />
                </div>
                <h3 className="text-[12.5px] font-bold mb-1" style={{ color: C.ink }}>{f.title}</h3>
                <p className="text-[10.5px] leading-relaxed" style={{ color: C.muted }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <section id="comparison" className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.softLg }}>
          <div className="grid md:grid-cols-2">
            {/* Regular */}
            <div className="p-6 sm:p-9">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F4F4F0' }}>
                  <span className="text-[16px]" style={{ color: C.muted }}>×</span>
                </div>
                <span className="text-[15px] font-bold" style={{ color: C.ink }}>Regular SMM Panels</span>
              </div>
              <div className="space-y-3">
                {[
                  'Same quantity every batch — easy to detect',
                  'Fixed intervals — bot pattern visible',
                  '24/7 delivery — unnatural behavior',
                  'Accounts get flagged & banned',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#EF4444' }} />
                    <span className="text-[13px] leading-relaxed" style={{ color: C.ink2 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Us */}
            <div className="p-6 sm:p-9 relative" style={{ background: 'linear-gradient(180deg, #faf8f5, #FFFFFF)' }}>
              <span className="absolute top-5 right-5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md"
                style={{ background: C.orange, color: 'white' }}>This panel</span>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#DCFCE7' }}>
                  <CheckCircle2 className="w-4.5 h-4.5" style={{ color: '#4A6741', width: 18, height: 18 }} />
                </div>
                <span className="text-[15px] font-bold" style={{ color: C.ink }}>Grinzo</span>
              </div>
              <div className="space-y-3">
                {[
                  'Random variance — looks like real users',
                  'Jittered timing — undetectable patterns',
                  'Peak hours + night slow — human behavior',
                  '100% safe, zero bans reported',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#4A6741' }} />
                    <span className="text-[13px] leading-relaxed" style={{ color: C.ink2 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap py-5 px-6"
            style={{ borderTop: `1px solid ${C.line}`, background: '#FAFAF7' }}>
            {[
              { icon: '🏆', text: '50,000+ Orders Delivered' },
              { icon: '🛡️', text: 'Zero Account Bans' },
              { icon: '⚡', text: '99.9% Success Rate' },
            ].map((s) => (
              <span key={s.text} className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: C.ink2 }}>
                <span>{s.icon}</span> {s.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS / WHY ═══ */}
      <section id="how-it-works" className="py-14 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Pill>Why choose us</Pill>
            <h2 className="mt-4 text-[1.75rem] sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight"
              style={{ color: C.ink, fontFamily: "'Outfit', system-ui" }}>
              Built for <span style={{ color: C.orange }}>real growth</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: TrendingUp, title: 'Natural growth curves', desc: 'Variable delivery quantities that perfectly mimic real organic engagement patterns.' },
              { icon: Zap, title: 'Peak hour optimization', desc: 'Higher delivery during active hours (6 PM – 10 PM) for realistic engagement timing.' },
              { icon: Shield, title: 'Account safety', desc: 'Randomized patterns prevent detection and keep your accounts 100% secure.' },
              { icon: BarChart3, title: 'Live preview', desc: 'See exactly when and how much will be delivered before placing your order.' },
              { icon: CheckCircle2, title: 'Premium quality', desc: 'High-quality engagement from real-looking accounts with complete profiles.' },
              { icon: Shuffle, title: 'Organic variance', desc: '±25% random variance on each delivery for unpredictable, natural growth.' },
            ].map((f) => (
              <div key={f.title} className="group rounded-2xl p-6 sm:p-7 transition-all hover:-translate-y-1"
                style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.soft }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105"
                  style={{ background: C.peach }}>
                  <f.icon className="w-5 h-5" style={{ color: C.orangeDeep }} />
                </div>
                <h3 className="text-[15px] font-bold mb-2" style={{ color: C.ink }}>{f.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: C.ink2 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING / SUBSCRIPTION ═══ */}
      <section id="pricing" className="py-14 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <Pill><Sparkles className="w-3 h-3" /> Simple, transparent pricing</Pill>
            <h2 className="mt-4 text-[1.75rem] sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight"
              style={{ color: C.ink, fontFamily: "'Outfit', system-ui" }}>
              Choose your <span style={{ color: C.orange }}>growth plan</span>
            </h2>
            <p className="mt-3 text-[14px] sm:text-[15.5px] max-w-xl mx-auto" style={{ color: C.ink2 }}>
              Unlock the full power of organic delivery. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="rounded-3xl p-7 sm:p-8 flex flex-col"
              style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: C.soft }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: C.ink2 }}>Monthly</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md"
                  style={{ background: C.peach, color: C.orangeDeep }}>Flexible</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-[44px] font-black tracking-tight" style={{ color: C.ink, fontFamily: "'Outfit', system-ui" }}>$10</span>
                <span className="text-[14px] font-medium" style={{ color: C.muted }}>/month</span>
              </div>
              <p className="text-[13px] mb-6" style={{ color: C.ink2 }}>Billed monthly. Full access to all features.</p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {[
                  'Unlimited organic orders',
                  'All platforms & engagement types',
                  'Live delivery preview',
                  'Peak hour optimization',
                  'Priority support',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[13px]" style={{ color: C.ink2 }}>
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.orange }} />
                    {t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="h-11 px-5 rounded-xl text-[13.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                style={{ color: C.ink, background: '#FAFAF7', border: `1px solid ${C.line}` }}>
                Get started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Lifetime — Featured */}
            <div className="rounded-3xl p-7 sm:p-8 flex flex-col relative"
              style={{
                background: `linear-gradient(180deg, #faf8f5 0%, #FFFFFF 100%)`,
                border: `2px solid ${C.orange}`,
                boxShadow: C.softLg,
              }}>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white whitespace-nowrap"
                style={{ background: C.orange, boxShadow: '0 4px 12px rgba(74,103,65,.35)' }}>
                Best value · Save 90%
              </span>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: C.orangeDeep }}>Lifetime</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md"
                  style={{ background: C.orange, color: 'white' }}>One-time</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[44px] font-black tracking-tight" style={{ color: C.ink, fontFamily: "'Outfit', system-ui" }}>$99</span>
                <span className="text-[14px] font-medium line-through" style={{ color: C.muted }}>$240/yr</span>
              </div>
              <p className="text-[13px] mb-6" style={{ color: C.ink2 }}>Pay once. Use forever. No renewals.</p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {[
                  'Everything in Monthly',
                  'Lifetime access — no recurring fees',
                  'All future updates included',
                  'Early access to new features',
                  'VIP priority support',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[13px]" style={{ color: C.ink2 }}>
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.orange }} />
                    {t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="h-11 px-5 rounded-xl text-[13.5px] font-semibold text-white flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDeep})`, boxShadow: '0 10px 24px rgba(74,103,65,.35)' }}>
                <Sparkles className="w-4 h-4" /> Get lifetime access
              </Link>
            </div>
          </div>

          <p className="text-center text-[12px] mt-8" style={{ color: C.muted }}>
            🔒 Secure payment · Instant activation · 100% money-back guarantee
          </p>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto rounded-[28px] text-center py-14 sm:py-20 px-6 sm:px-10 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${C.ink} 0%, #1A1A28 100%)`, boxShadow: C.softLg }}>
          {/* glow */}
          <div aria-hidden className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full"
            style={{ background: `radial-gradient(closest-side, rgba(74,103,65,.4), transparent 70%)`, filter: 'blur(20px)' }} />
          <div aria-hidden className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full"
            style={{ background: `radial-gradient(closest-side, rgba(167,200,156,.25), transparent 70%)`, filter: 'blur(20px)' }} />

          <div className="relative">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5"
              style={{ background: 'rgba(255,255,255,.1)', color: '#cdddc4', border: '1px solid rgba(167,200,156,.2)' }}>
              <Sparkles className="w-3 h-3" /> Free to start
            </span>
            <h2 className="text-[1.85rem] sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight mb-4 text-white"
              style={{ fontFamily: "'Outfit', system-ui" }}>
              Ready to grow <span style={{ background: `linear-gradient(135deg, ${C.orange}, #cdddc4)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>organically</span>?
            </h2>
            <p className="text-[14.5px] sm:text-[16px] mb-8 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,.7)' }}>
              Join thousands of creators using our organic delivery system. No credit card required.
            </p>
            <Link to="/auth" className="inline-flex h-12 sm:h-13 px-8 rounded-xl text-[14.5px] font-bold items-center gap-2 transition-transform hover:-translate-y-0.5"
              style={{ background: 'white', color: C.ink, boxShadow: '0 10px 30px rgba(0,0,0,.25)' }}>
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8" style={{ background: C.bg, borderTop: `1px solid ${C.line}` }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src={logo} alt="" className="w-9 h-9 rounded-xl object-cover" style={{ border: `1px solid ${C.line}` }} />
                <span className="text-[15px] font-bold" style={{ color: C.ink }}>Grinzo</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: C.muted }}>
                Revolutionary organic social media growth platform with natural delivery patterns.
              </p>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider mb-4" style={{ color: C.ink }}>Quick Links</h4>
              <div className="space-y-2.5">
                <Link to="/auth" className="block text-[13px] hover:text-green-600 transition-colors" style={{ color: C.ink2 }}>Get Started</Link>
                <Link to="/services" className="block text-[13px] hover:text-green-600 transition-colors" style={{ color: C.ink2 }}>Services</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider mb-4" style={{ color: C.ink }}>Legal</h4>
              <div className="space-y-2.5">
                {[
                  { to: '/terms', icon: FileText, label: 'Terms of Service' },
                  { to: '/privacy', icon: Lock, label: 'Privacy Policy' },
                  { to: '/refund', icon: FileText, label: 'Refund Policy' },
                  { to: '/shipping', icon: FileText, label: 'Shipping & Delivery' },
                  { to: '/cookies', icon: FileText, label: 'Cookie Policy' },
                ].map((l) => (
                  <Link key={l.to} to={l.to} className="flex items-center gap-1.5 text-[13px] hover:text-green-600 transition-colors" style={{ color: C.ink2 }}>
                    <l.icon className="w-3 h-3 flex-shrink-0" /> {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider mb-4" style={{ color: C.ink }}>Support</h4>
              <div className="space-y-2.5">
                {[
                  { to: '/about', icon: HelpCircle, label: 'About Us' },
                  { to: '/contact', icon: Mail, label: 'Contact Us' },
                  { to: '/support', icon: HelpCircle, label: 'Help Center' },
                  { to: '/api-access', icon: Code2, label: 'API Documentation' },
                ].map((l) => (
                  <Link key={l.label} to={l.to} className="flex items-center gap-1.5 text-[13px] hover:text-green-600 transition-colors" style={{ color: C.ink2 }}>
                    <l.icon className="w-3 h-3 flex-shrink-0" /> {l.label}
                  </Link>
                ))}
                <a href="mailto:support@grinzo.app" className="block text-[12px] mt-2" style={{ color: C.muted }}>support@grinzo.app</a>
                <a href="tel:+13678288027" className="block text-[12px]" style={{ color: C.muted }}>+1 (367) 828-8027</a>
                <p className="text-[12px] leading-relaxed mt-2" style={{ color: C.muted }}>
                  Grinzo LLC<br />
                  8 The Green, Suite #14490<br />
                  Dover, DE 19901<br />
                  United States
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6" style={{ borderTop: `1px solid ${C.line}` }}>
            <p className="text-[12px]" style={{ color: C.muted }}>© {new Date().getFullYear()} Grinzo LLC — Dover, Delaware, USA. All rights reserved.</p>
            <div className="flex items-center gap-5 text-[12px] font-medium" style={{ color: C.muted }}>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" style={{ color: '#5e8a5c' }} /> SSL Secured</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" style={{ color: C.orange }} /> 99.9% Uptime</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
