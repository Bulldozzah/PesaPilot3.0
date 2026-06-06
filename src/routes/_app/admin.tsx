import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MicrofinanceManager } from "@/components/admin/microfinance-manager";

export const Route = createFileRoute("/_app/admin")({ component: Admin });

function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [counts, setCounts] = useState({ templates: 0, categories: 0, lenders: 0, microfins: 0 });
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => setIsAdmin((data ?? []).some((r) => r.role === "admin")));
    (async () => {
      const [a,b,c,d] = await Promise.all([
        supabase.from("business_templates").select("*",{count:"exact",head:true}),
        supabase.from("business_categories").select("*",{count:"exact",head:true}),
        supabase.from("lenders").select("*",{count:"exact",head:true}),
        supabase.from("microfinance_institutions").select("*",{count:"exact",head:true}),
      ]);
      setCounts({ templates: a.count ?? 0, categories: b.count ?? 0, lenders: c.count ?? 0, microfins: d.count ?? 0 });
    })();
  }, [user]);

  if (isAdmin === false) {
    return (
      <div>
        <PageHeader title="Admin Panel" subtitle="Restricted area." />
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5 text-sm">You don't have admin access. Ask an administrator to grant you the <b>admin</b> role.</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Admin Panel" subtitle="Manage reference data and microfinance profiles." />

      <Tabs defaultValue="microfinance">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="microfinance">Microfinance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Business templates", counts.templates],
              ["Categories", counts.categories],
              ["Lenders", counts.lenders],
              ["Microfinance", counts.microfins],
            ].map(([l,v]) => (
              <div key={l as string} className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs uppercase text-muted-foreground">{l}</div>
                <div className="mt-2 font-display text-3xl font-bold text-primary">{v as number}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="microfinance" className="mt-4">
          {user && <MicrofinanceManager userId={user.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
