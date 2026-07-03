import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { LiveChatWidget } from '@/components/chat/LiveChatWidget';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps { children: ReactNode; }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen w-full bg-[#030303] text-white overflow-x-hidden selection:bg-purple-500/30 antialiased relative">
      {/* Ambient aurora + grid */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          }}
        />
        <div className="absolute top-[-20%] left-[10%] w-[700px] h-[420px] bg-purple-600/25 blur-[140px] rounded-full" />
        <div className="absolute top-[30%] right-[-15%] w-[480px] h-[480px] bg-fuchsia-600/12 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[520px] h-[520px] bg-indigo-600/15 blur-[140px] rounded-full" />
      </div>

      <div className="flex w-full">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
          <Sidebar />
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-3 bg-[#070710]/85 backdrop-blur-xl border-b border-white/5">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-transparent border-none">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold tracking-wide">OrganicSMM Pro</span>
          <div className="w-9" />
        </header>

        <main className="w-full relative lg:pl-64">
          <div className="min-h-screen pt-16 lg:pt-6 pb-10 px-3 sm:px-5 lg:px-8">
            <div className="max-w-6xl mx-auto w-full">{children}</div>
          </div>
        </main>
      </div>

      <LiveChatWidget />
    </div>
  );
}
