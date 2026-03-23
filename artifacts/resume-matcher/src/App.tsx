import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Analyze from "@/pages/Analyze";
import Processing from "@/pages/Processing";
import Results from "@/pages/Results";
import History from "@/pages/History";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/analyze">
          <ProtectedRoute component={Analyze} />
        </Route>
        <Route path="/analyses/:id/processing">
          <ProtectedRoute component={Processing} />
        </Route>
        <Route path="/analyses/:id/results">
          <ProtectedRoute component={Results} />
        </Route>
        <Route path="/history">
          <ProtectedRoute component={History} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
