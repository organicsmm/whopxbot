import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { LiveChatWidget } from '@/components/chat/LiveChatWidget';

interface DashboardLayoutProps { children: ReactNode; }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #f3ede2 40%, #e8ddc9 70%, #faf8f5 100%)', color: '#2a2418' }}>
      <aside className="fixed inset-y-0 left-0 z-40 w-[260px] hidden lg:block">
        <Sidebar />
      </aside>
      <MobileBottomNav />
      <main className="lg:pl-[260px] w-full">
       <div className="min-h-screen pt-16 lg:pt-0 px-3 sm:px-4 py-4 sm:py-5 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </div>
      </main>
      <LiveChatWidget />
    </div>
  );
}
