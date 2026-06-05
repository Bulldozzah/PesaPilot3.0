import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { useMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/lenders")({ component: Lenders });

function Lenders() {
  const money = useMoney();
  const [rows, setRows] = useState<any[]>([]);
  const [type, setType] = useState<string | null>(null);
  useEffect(() => { supabase.from("lenders").select("*").order("name").then(({ data }) => setRows(data ?? [])); }, []);
  const filtered = type ? rows.filter((r) => r.type === type) : rows;
  const types = Array.from(new Set(rows.map((r) => r.type)));
  return (
    <div>
      <PageHeader title="Lenders & Microfinance" subtitle="Banks, SACCOs, microfinance and digital options for your stage." />
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setType(null)} className={`rounded-full px-3 py-1 text-sm ${!type ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>All</button>
        {types.map((t) => <button key={t} onClick={() => setType(t)} className={`rounded-full px-3 py-1 text-sm capitalize ${type === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{t}</button>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => (
          <div key={l.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between"><div className="font-display text-lg font-semibold">{l.name}</div><Badge variant="secondary" className="capitalize">{l.type}</Badge></div>
            <p className="mt-1 text-sm text-muted-foreground">{l.description}</p>
            <div className="mt-3 space-y-1 text-xs">
              <div><span className="text-muted-foreground">Loan range:</span> {money(l.min_loan)} – {money(l.max_loan)}</div>
              <div><span className="text-muted-foreground">Interest:</span> {l.interest_rate_min}% – {l.interest_rate_max}% p.a.</div>
              <div className="text-muted-foreground">{l.requirements}</div>
            </div>
            {l.website && <a href={l.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Visit <ExternalLink className="h-3 w-3" /></a>}
          </div>
        ))}
      </div>
    </div>
  );
}
