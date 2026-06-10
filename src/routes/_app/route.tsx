import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    if (location.pathname.startsWith("/profile") || location.pathname.startsWith("/onboarding")) {
      setProfileChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      // Ensure session is fresh before checking profile
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Session expired, let auth context handle redirect to login
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("completed_onboarding, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      // If 401/auth error, don't redirect to profile setup - session issue
      if (error?.code === "PGRST301" || error?.message?.includes("JWT")) {
        console.warn("Auth error during profile check, refreshing session...");
        await supabase.auth.refreshSession();
        return;
      }
      setProfileChecked(true);
      const complete = !!data?.completed_onboarding && !!data?.full_name?.trim();
      if (!complete) {
        navigate({ to: "/profile", search: { firstTimeSetup: true }, replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="ml-2 text-sm font-medium text-muted-foreground">PesaPilot</div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
