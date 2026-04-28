"use client";
import { useSidebar } from "@/context/SidebarContext";

interface TopBarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function TopBar({ title, subtitle, action }: TopBarProps) {
  const { setOpen } = useSidebar();

  return (
    <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="md:hidden flex-shrink-0 text-text-3 hover:text-text transition-colors p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-text font-semibold text-base leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-text-3 text-xs mt-0.5 hidden sm:block truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0 ml-3">{action}</div>}
    </header>
  );
}
