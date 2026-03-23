import { ReactNode } from "react";
import { useAuth } from "@workspace/replit-auth-web";
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
