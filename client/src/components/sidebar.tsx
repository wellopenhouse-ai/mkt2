import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import LogoPng from '@/img/logo.png';
import {
  LayoutDashboard,
  Rocket,
  Image as ImageIcon,
  DollarSign,
  Filter,
  PenTool,
  TrendingUp,
  Bell,
  MessageCircle,
  Download,
  Globe,
  ChevronLeft,
  ChevronRight,
  CalendarCheck
} from 'lucide-react';

// O item de menu 'Integrações' foi removido.
const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/campaigns', label: 'Campanhas', icon: Rocket },
  { path: '/schedule', label: 'Cronograma', icon: CalendarCheck },
  { path: '/creatives', label: 'Criativos', icon: ImageIcon },
  { path: '/budget', label: 'Orçamento', icon: DollarSign },
  { path: '/landingpages', label: 'Landing Pages', icon: Globe },
  { path: '/funnel', label: 'Funil de Vendas', icon: Filter },
  { path: '/copy', label: 'Copy & IA', icon: PenTool },
  { path: '/metrics', label: 'Métricas', icon: TrendingUp },
  { path: '/alerts', label: 'Alertas', icon: Bell, notificationKey: 'alerts' },
  { path: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { path: '/export', label: 'Exportar', icon: Download },
];

interface DashboardData {
  metrics: any;
  recentCampaigns: any[];
  alertCount: number;
}

export default function Sidebar() {
  const [location] = useLocation();
  // O hook useAuthStore foi removido.
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ['dashboardDataSidebar'], 
    queryFn: async () => {
      // A chamada de API agora não depende mais do usuário.
      const response = await apiRequest('GET', '/api/dashboard?timeRange=30d'); 
      if (!response.ok) {
        console.error('Erro ao buscar dados do dashboard para a sidebar');
        return { metrics: {}, recentCampaigns: [], alertCount: 0 };
      }
      return response.json();
    },
    // A verificação de 'enabled' foi removida, a query agora sempre executa.
    staleTime: 5 * 60 * 1000, 
  });

  const alertCount = dashboardData?.alertCount || 0;

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <aside 
      className={cn(
        "neu-sidebar flex flex-col h-full transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[72px]" : "w-60"
      )}
    >
      <div className={cn(
          "p-3 flex items-center border-b border-sidebar-border shrink-0 justify-center h-[72px]"
        )}
      >
        <Link 
          href="/dashboard" 
          className={cn(
            "flex items-center justify-center group outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background rounded-md",
            isCollapsed ? "w-full h-full p-1" : "p-2"
          )}
          title={isCollapsed ? "Dashboard" : undefined}
        >
            <img 
              src={LogoPng}
              alt="USB MKT Logo" 
              className={cn(
                "transition-all duration-300 ease-in-out object-contain",
                isCollapsed ? "h-12 w-12" : "h-16 w-auto" 
              )}
              style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary)/0.6)) drop-shadow(0 0 12px hsl(var(--primary)/0.4))' }}
            />
        </Link>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (location === '/' && item.path === '/dashboard');
          // A verificação de 'user' foi removida da lógica de notificação.
          const hasNotification = item.notificationKey === 'alerts' && alertCount > 0;
          
          return (
            <Link key={item.path} href={item.path} title={isCollapsed ? item.label : undefined}>
              <div 
                className={cn(
                  "sidebar-link group relative", 
                  isActive && "active",
                  isCollapsed ? "justify-center aspect-square p-0" : "px-3 py-2.5 space-x-2.5"
                )}
              >
                <Icon className={cn(
                    "sidebar-link-icon w-[18px] h-[18px] shrink-0",
                     isActive ? "text-sidebar-accent-foreground icon-neon-glow" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground group-hover:icon-neon-glow"
                    )} 
                />
                {!isCollapsed && (
                  <span className={cn("sidebar-link-text text-xs font-medium truncate", isActive && "text-neon-glow")}>{item.label}</span>
                )}
                {!isCollapsed && hasNotification && (
                  <span className="alert-badge ml-auto">{alertCount > 9 ? '9+' : alertCount}</span>
                )}
                 {isCollapsed && hasNotification && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border-2 border-sidebar-background"></span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className={cn(
          "px-2.5 py-3 border-t border-sidebar-border mt-auto shrink-0", 
          isCollapsed ? "space-y-2" : "flex items-center justify-between gap-2"
        )}
      >
        <div className={cn(isCollapsed ? "w-full flex justify-center" : "")}>
            <ThemeToggle />
        </div>
        <Button
            variant="ghost"
            onClick={toggleSidebar}
            className={cn(
                "theme-toggle-button text-muted-foreground hover:text-foreground",
                isCollapsed ? "w-full" : "p-2" 
            )}
            title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* A seção de perfil de usuário e o botão de logout foram removidos. */}
    </aside>
  );
}