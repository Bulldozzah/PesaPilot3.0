import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";

export const Route = createFileRoute("/_app/admin")({ component: Admin });

function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [counts, setCounts] = useState({ templates: 0, categories: 0, lenders: 0, regulators: 0 });
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => setIsAdmin((data ?? []).some((r) => r.role === "admin")));
    (async () => {
      const [a,b,c,d] = await Promise.all([
        supabase.from("business_templates").select("*",{count:"exact",head:true}),
        supabase.from("business_categories").select("*",{count:"exact",head:true}),
        supabase.from("lenders").select("*",{count:"exact",head:true}),
        supabase.from("regulatory_authorities").select("*",{count:"exact",head:true}),
      ]);
      setCounts({ templates: a.count ?? 0, categories: b.count ?? 0, lenders: c.count ?? 0, regulators: d.count ?? 0 });
    })();
  }, [user]);

  return (
    <div>
      <PageHeader title="Admin Panel" subtitle="Manage reference data — business types, categories, lenders, regulators." />
      {isAdmin === false && <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5 text-sm">You don't have admin access. Ask an administrator to grant you the <b>admin</b> role.</div>}
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {[
          ["Business templates", counts.templates],
          ["Categories", counts.categories],
          ["Lenders", counts.lenders],
          ["Regulatory authorities", counts.regulators],
        ].map(([l,v]) => (
          <div key={l as string} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase text-muted-foreground">{l}</div>
            <div className="mt-2 font-display text-3xl font-bold text-primary">{v as number}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Use the database console to add/edit reference data. Editable admin UI coming next.</p>
    </div>
  );
}
