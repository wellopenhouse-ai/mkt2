import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import Creatives from "@/pages/creatives";
import Budget from "@/pages/budget";
import LandingPagesPage from "@/pages/landingpages";
import WhatsApp from "@/pages/whatsapp";
import Copy from "@/pages/copy";
import Funnel from "@/pages/funnel";
import Metrics from "@/pages/metrics";
import Alerts from "@/pages/alerts";
import Export from "@/pages/export";
import SchedulePage from "@/pages/schedule";
import NotFound from "@/pages/not-found";
import { FloatingMCPAgent } from "@/components/mcp/FloatingMCPAgent";

// O componente AppRoutes agora define a estrutura de layout e as rotas internas.
// O componente ProtectedRoute foi removido, pois não há mais autenticação.
function AppRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/schedule" component={SchedulePage} />
        <Route path="/creatives" component={Creatives} />
        <Route path="/budget" component={Budget} />
        <Route path="/landingpages" component={LandingPagesPage} />
        <Route path="/whatsapp" component={WhatsApp} />
        <Route path="/copy" component={Copy} />
        <Route path="/funnel" component={Funnel} />
        <Route path="/metrics" component={Metrics} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/export" component={Export} />
        {/* As rotas de login e integrações foram removidas */}
        <Route><NotFound /></Route>
      </Switch>
    </Layout>
  );
}

function App() {
  // A lógica de autenticação (useAuthStore, GoogleOAuthProvider, etc.) foi removida.
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter>
            <Toaster />
            <AppRoutes /> {/* As rotas agora incluem o Layout */}
            <FloatingMCPAgent />
          </WouterRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;