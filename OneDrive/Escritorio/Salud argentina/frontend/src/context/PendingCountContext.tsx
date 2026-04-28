"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getRole } from "@/lib/auth";

const PendingCountContext = createContext(0);

export function PendingCountProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (getRole() !== "financiador_admin") return;
    api.listPractitioners(false)
      .then((all) => setCount(all.filter((p) => !p.aprobado).length))
      .catch(() => {});
  }, []);

  return (
    <PendingCountContext.Provider value={count}>
      {children}
    </PendingCountContext.Provider>
  );
}

export function usePendingCount() {
  return useContext(PendingCountContext);
}
