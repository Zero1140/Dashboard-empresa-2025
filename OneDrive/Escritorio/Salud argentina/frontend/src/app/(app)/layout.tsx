"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { ToastProvider } from "@/context/ToastContext";
import { isAuthenticated } from "@/lib/auth";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { open, setOpen } = useSidebar();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen bg-base">
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <Sidebar />
      <main className="flex-1 md:ml-60 min-h-screen overflow-x-hidden pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ToastProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </ToastProvider>
    </SidebarProvider>
  );
}
