import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import logo from '@/assets/logo.jpg';

export function MobileBottomNav() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 lg:hidden">
        <div className="flex items-center justify-between h-14 px-4 bg-[#030303]/80 backdrop-blur-md border-b border-white/5">
          <button onClick={() => setSidebarOpen(true)} className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Grinzo" className="w-7 h-7 rounded-md object-cover ring-1 ring-white/10" />
            <span className="text-[14px] font-bold tracking-tight !text-white">Grinzo</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden shadow-2xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
