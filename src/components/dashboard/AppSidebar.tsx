import React from "react";
import {
  LayoutDashboard,
  FileText,
  List,
  Users,
  Settings,
  LogOut,
  FolderOpen,
  BarChart3,
  Repeat,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client"; // eslint-disable-line @typescript-eslint/no-unused-vars
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Emitir Nota", url: "/dashboard/emitir-nota", icon: FileText },
  { title: "Recorrência", url: "/dashboard/recorrencia", icon: Repeat },
  { title: "Histórico de Notas", url: "/dashboard/notas", icon: List },
  { title: "Documentos & Impostos", url: "/dashboard/documentos", icon: FolderOpen },
  { title: "Meus Clientes", url: "/dashboard/clientes", icon: Users },
  { title: "Relatórios", url: "/dashboard/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon" className="bg-background border-r border-border/60">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-3 py-4 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-lg bg-cta/15 flex items-center justify-center">
              <FileText className="w-4 h-4 text-cta" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-lg text-sidebar-foreground tracking-tight">
                Qontax
              </span>
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="group flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground rounded-lg transition-colors hover:bg-muted/60 hover:text-foreground"
                      activeClassName="bg-primary/5 text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0 group-hover:text-primary" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-muted/40">
        <div className="p-2">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/40">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-3 mt-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
