import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, FileText, LayoutDashboard, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, openAuthModal, logout, isLoading } = useAuth();

  const navItems = [
    { href: "/analyze", label: "Analyze", icon: FileText },
    { href: "/history", label: "History", icon: LayoutDashboard },
  ];

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.email?.split("@")[0] ?? "User";

  const initials = (user?.firstName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/70">
      <div className="pw-section h-full flex items-center justify-between">
        
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg text-foreground tracking-tight">
              Resume<span className="text-primary">Matcher</span>
            </span>
          </Link>

          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                    location.startsWith(item.href)
                      ? "bg-secondary text-secondary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{displayName}</span>
                <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{initials}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-muted-foreground hover:bg-slate-100 hover:text-destructive rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors duration-200"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
