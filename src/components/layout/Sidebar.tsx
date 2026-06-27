import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Wallet, ListOrdered, Settings, LifeBuoy, Shield, LogOut, Rocket, Sparkles, X, Code2, Droplets } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

interface SidebarProps { onClose?: () => void; }

const userNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Rocket, label: 'Full Engagement', path: '/engagement-order', highlight: true },
  { icon: Droplets, label: 'Mass Order', path: '/mass-order', highlight: true },
  { icon: Sparkles, label: 'Engagement Orders', path: '/engagement-orders' },
  { icon: ShoppingCart, label: 'New Order', path: '/order' },
  { icon: ListOrdered, label: 'Orders', path: '/orders' },
  { icon: Package, label: 'Services', path: '/services' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: Code2, label: 'API Access', path: '/api-access' },
  { icon: LifeBuoy, label: 'Support', path: '/support' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const adminNavItems = [{ icon: Shield, label: 'Admin Panel', path: '/admin' }];

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { isAdmin, signOut, wallet, profile } = useAuth();
  const { formatPrice } = useCurrency();

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-[#070710]/95 backdrop-blur-xl border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Grinzo" className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10" />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight leading-tight !text-white">Grinzo</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] leading-tight text-purple-300/80">✦ v2.0</span>
          </div>
        </Link>
        <button onClick={onClose} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      {profile && (
        <div className="mx-4 mb-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-gradient-to-br from-purple-500 to-fuchsia-600">
            {profile.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold truncate !text-white">{profile.full_name || 'User'}</p>
            <p className="text-[10px] truncate text-white/40">{profile.email}</p>
          </div>
        </div>
      )}

      {/* Wallet */}
      <div className="mx-4 mb-4">
        <div className="relative rounded-xl p-4 bg-gradient-to-b from-purple-600/15 to-white/[0.02] border border-purple-400/25 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/30 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="w-3 h-3 text-purple-300" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-200/80">Wallet Balance</span>
            </div>
            <p className="text-[22px] font-extrabold tracking-tight mb-3 !text-white">{formatPrice(wallet?.balance || 0)}</p>
            <Link to="/wallet" onClick={onClose} className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg text-[11px] font-semibold text-black bg-white hover:bg-purple-50 transition-colors shadow-[0_0_18px_rgba(255,255,255,0.15)]">
              <Wallet className="w-3 h-3" /> Add Funds
            </Link>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
        <p className="px-3 mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30">Menu</p>
        {userNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] mb-0.5 transition-all duration-150 border',
                isActive
                  ? 'bg-white/[0.06] border-white/10 text-white font-semibold'
                  : 'border-transparent text-white/60 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <item.icon className={cn('w-4 h-4', isActive ? 'text-purple-300' : 'text-white/40')} />
              <span className="flex-1">{item.label}</span>
              {(item as any).highlight && !isActive && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30">HOT</span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 mx-3 border-t border-white/5" />
            <p className="px-3 mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30">Admin</p>
            {adminNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path} onClick={onClose}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] mb-0.5 transition-all duration-150 border',
                    isActive
                      ? 'bg-fuchsia-500/10 border-fuchsia-400/30 text-fuchsia-200 font-semibold'
                      : 'border-transparent text-white/60 hover:text-white hover:bg-white/[0.04]'
                  )}
                >
                  <item.icon className={cn('w-4 h-4', isActive ? 'text-fuchsia-300' : 'text-white/40')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Currency */}
      <div className="px-3 pb-2">
        <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[12px] font-medium bg-white/[0.03] border border-white/10 text-white/60">
          <div className="flex items-center gap-2">
            <span className="text-base">🇮🇳</span>
            <span className="uppercase tracking-wider">INR</span>
          </div>
          <span className="text-[10px] text-white/40">₹</span>
        </div>
      </div>

      {/* Telegram */}
      <div className="px-3 pb-1">
        <a href="https://t.me/whopcampaign" target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-colors bg-sky-500/10 border border-sky-400/20 text-sky-200 hover:bg-sky-500/15">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          <div className="flex flex-col">
            <span className="font-semibold text-[11px]">Join our Telegram</span>
            <span className="text-[10px] text-sky-200/60">Updates & support</span>
          </div>
        </a>
      </div>

      {/* Sign out */}
      <div className="p-3 border-t border-white/5">
        <button onClick={() => signOut()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors text-white/60 hover:text-white hover:bg-red-500/10">
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
