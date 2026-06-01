import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/roadmaps/")({ component: List });

function List() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: businesses } = await supabase.from("user_businesses").select("*, business_templates(id)").order("created_at", { ascending: false });
      const enriched = await Promise.all((businesses ?? []).map(async (b: any) => {
        if (!b.template_id) return { ...b, total: 0, done: 0 };
        const { count: total } = await supabase.from("business_template_steps").select("*", { count: "exact", head: true }).eq("template_id", b.template_id);
        const { count: done } = await supabase.from("user_roadmap_progress").select("*", { count: "exact", head: true }).eq("user_business_id", b.id).eq("completed", true);
        return { ...b, total: total ?? 0, done: done ?? 0 };
      }));
      setRows(enriched);
    })();
  }, [user]);

  return (
    <div>
      <PageHeader title="Roadmaps" subtitle="Track step-by-step progress for each of your businesses." />
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          Start a business from <Link to="/businesses" className="text-primary hover:underline">the directory</Link> to begin a roadmap.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
            return (
              <Link key={r.id} to="/roadmaps/$businessId" params={{ businessId: r.id }} className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <div className="font-display text-lg font-semibold">{r.name}</div>
                  <div className="text-sm text-muted-foreground">{r.done} / {r.total} steps</div>
                </div>
                <Progress value={pct} className="mt-3" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
