'use client';

import Sidebar from './Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 transition-all">
        {children}
      </main>
    </div>
  );
}