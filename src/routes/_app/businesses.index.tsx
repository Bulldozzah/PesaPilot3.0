import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { formatMoneyRange } from "@/lib/format";

export const Route = createFileRoute("/_app/businesses/")({
  head: () => ({ meta: [{ title: "Business Discovery — Pilot-Pesa" }] }),
  component: Browse,
});

function Browse() {
  const [cats, setCats] = useState<any[]>([]);
  const [tpls, setTpls] = useState<any[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("business_categories").select("*").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("business_templates").select("*").order("name").then(({ data }) => setTpls(data ?? []));
  }, []);

  const filtered = filter ? tpls.filter((t) => t.category_id === filter) : tpls;

  return (
    <div>
      <PageHeader title="Business Discovery" subtitle={`${tpls.length} business templates across ${cats.length} categories`} />
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setFilter(null)} className={`rounded-full px-3 py-1 text-sm ${!filter ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>All</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={`rounded-full px-3 py-1 text-sm ${filter === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{c.name}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Link key={t.id} to="/businesses/$slug" params={{ slug: t.slug }} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">{t.name}</h3>
              <Badge variant={t.difficulty === "easy" ? "secondary" : t.difficulty === "hard" ? "destructive" : "default"}>{t.difficulty}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
            <div className="mt-4 space-y-1 text-xs">
              <div><span className="text-muted-foreground">Startup:</span> <span className="font-medium">{formatMoneyRange(t.startup_cost_min, t.startup_cost_max, t.currency)}</span></div>
              <div><span className="text-muted-foreground">Monthly profit:</span> <span className="font-medium text-success">{formatMoneyRange(t.monthly_profit_min, t.monthly_profit_max, t.currency)}</span></div>
              <div><span className="text-muted-foreground">Time to profit:</span> <span className="font-medium">~{t.time_to_profit_months} months</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
