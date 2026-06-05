import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen, Building2, Compass, Home, Landmark, LayoutDashboard, LineChart,
  ListChecks, LogOut, PiggyBank, Shield, Sparkles, Users, Wallet,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const sections = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", icon: LayoutDashboard, title: "Dashboard" }],
  },
  {
    label: "Start & Grow",
    items: [
      { to: "/businesses", icon: Compass, title: "Business Discovery" },
      { to: "/my-businesses", icon: Building2, title: "My Businesses" },
      { to: "/roadmaps", icon: ListChecks, title: "Roadmaps" },
      { to: "/business-plans", icon: BookOpen, title: "Business Plans" },
    ],
  },
  {
    label: "Business Finance",
    items: [
      { to: "/accounting", icon: LineChart, title: "Accounting" },
      { to: "/accounting/reports", icon: LineChart, title: "Reports" },
      { to: "/bank-accounts", icon: Landmark, title: "Bank Accounts" },
      { to: "/contacts", icon: Users, title: "Vendors & Customers" },
    ],
  },
  {
    label: "Personal Finance",
    items: [
      { to: "/personal", icon: Wallet, title: "Income & Expenses" },
      { to: "/savings", icon: PiggyBank, title: "Savings Goals" },
      { to: "/wallet-planner", icon: Wallet, title: "Wallet Planner" },
    ],
  },
  {
    label: "Discover",
    items: [
      { to: "/lenders", icon: Landmark, title: "Lenders" },
    ],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user } = useAuth();
  const isActive = (p: string) => path === p || path.startsWith(p + "/");

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Pilot-Pesa</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((s) => (
          <SidebarGroup key={s.label}>
            <SidebarGroupLabel>{s.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {s.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/profile")} tooltip="Profile">
                  <Link to="/profile">
                    <Home /> <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip="Admin">
                  <Link to="/admin">
                    <Shield /> <span>Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-2 text-xs text-sidebar-foreground/70">
          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
            {user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1 truncate">{user?.email}</div>
          <button onClick={signOut} className="rounded p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" title="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
