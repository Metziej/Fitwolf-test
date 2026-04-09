
import React from 'react';

interface NavigationDockProps {
  activeTab: 'ARMORY' | 'COMMAND' | 'GUILD' | 'ADMIN';
  isAdmin?: boolean;
  onTabChange: (tab: 'ARMORY' | 'COMMAND' | 'GUILD' | 'ADMIN') => void;
}

export default function NavigationDock({ activeTab, onTabChange, isAdmin }: NavigationDockProps) {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#050505] border-t border-white/10 z-[999] flex items-center justify-around h-20 px-2 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
      <button 
        onClick={() => onTabChange('ARMORY')}
        className={`flex-1 h-full flex flex-col items-center justify-center transition-all duration-300 ${activeTab === 'ARMORY' ? 'bg-[#00F0FF]/10 text-[#00F0FF]' : 'opacity-40 text-white hover:opacity-100'}`}
      >
        <span className="text-xl">🛡️</span>
        <span className="text-[8px] uppercase font-black tracking-[0.2em] mt-1">Armory</span>
      </button>

      <button 
        onClick={() => onTabChange('COMMAND')}
        className={`flex-1 h-full flex flex-col items-center justify-center transition-all duration-300 ${activeTab === 'COMMAND' ? 'bg-[#FF2A2A]/10 text-[#FF2A2A]' : 'opacity-40 text-white hover:opacity-100'}`}
      >
        <span className="text-xl">🐺</span>
        <span className="text-[8px] uppercase font-black tracking-[0.2em] mt-1">Command</span>
      </button>

      <button 
        onClick={() => onTabChange('GUILD')}
        className={`flex-1 h-full flex flex-col items-center justify-center transition-all duration-300 ${activeTab === 'GUILD' ? 'bg-[#00FF88]/10 text-[#00FF88]' : 'opacity-40 text-white hover:opacity-100'}`}
      >
        <span className="text-xl">👥</span>
        <span className="text-[8px] uppercase font-black tracking-[0.2em] mt-1">Guild</span>
      </button>

      {isAdmin && (
        <button 
          onClick={() => onTabChange('ADMIN')}
          className={`flex-1 h-full flex flex-col items-center justify-center transition-all duration-300 ${activeTab === 'ADMIN' ? 'bg-[#FFB800]/10 text-[#FFB800]' : 'opacity-40 text-white hover:opacity-100'}`}
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[8px] uppercase font-black tracking-[0.2em] mt-1">System</span>
        </button>
      )}
    </div>
  );
}
