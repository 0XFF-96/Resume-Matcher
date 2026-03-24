import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.05),transparent_32%),#f8f9ff] font-sans text-slate-900">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
