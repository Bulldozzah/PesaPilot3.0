import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Phone, Mail, MessageCircle, MapPin, Building2, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMoney } from "@/lib/format";
import { ApplyDialog, type Microfin } from "@/components/lenders/apply-dialog";

export const Route = createFileRoute("/_app/lenders")({ component: Lenders });

function Lenders() {
  const money = useMoney();
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [type, setType] = useState<string | null>(null);
  const [mfis, setMfis] = useState<Microfin[]>([]);
  const [applyTo, setApplyTo] = useState<Microfin | null>(null);

  useEffect(() => {
    supabase.from("lenders").select("*").order("name").then(({ data }) => setRows(data ?? []));
    supabase.from("microfinance_institutions").select("*").eq("is_active", true).order("name")
      .then(({ data }) => setMfis((data ?? []) as Microfin[]));
  }, []);

  const filtered = type ? rows.filter((r) => r.type === type) : rows;
  const types = Array.from(new Set(rows.map((r) => r.type)));

  return (
    <div>
      <PageHeader title="Lenders & Microfinance" subtitle="Banks, SACCOs, microfinance and digital options for your stage." />

      <Tabs defaultValue="microfinance">
        <TabsList>
          <TabsTrigger value="microfinance">Microfinance ({mfis.length})</TabsTrigger>
          <TabsTrigger value="directory">Lender Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="microfinance" className="mt-6">
          {mfis.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
              No microfinance institutions listed yet. Check back soon.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mfis.map((m) => (
                <MicrofinCard key={m.id} m={m} money={money} onApply={() => setApplyTo(m)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="directory" className="mt-6">
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
        </TabsContent>
      </Tabs>

      {applyTo && user && (
        <ApplyDialog mfi={applyTo} userId={user.id} open={!!applyTo} onClose={() => setApplyTo(null)} />
      )}
    </div>
  );
}

function MicrofinCard({ m, money, onApply }: { m: Microfin; money: (n: number) => string; onApply: () => void }) {
  const waNumber = (m.whatsapp ?? "").replace(/[^0-9]/g, "");
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
          {m.logo_url
            ? <img src={m.logo_url} alt={m.name} className="h-full w-full object-cover" />
            : <Building2 className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <div className="font-display text-lg font-semibold leading-tight">{m.name}</div>
          {m.address && <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{m.address}</div>}
        </div>
      </div>

      {m.description && <p className="mt-3 text-sm text-muted-foreground">{m.description}</p>}

      {(m.min_loan != null || m.interest_rate_min != null) && (
        <div className="mt-3 space-y-1 text-xs">
          {m.min_loan != null && <div><span className="text-muted-foreground">Loan range:</span> {money(m.min_loan)} – {money(m.max_loan ?? 0)}</div>}
          {m.interest_rate_min != null && <div><span className="text-muted-foreground">Interest:</span> {m.interest_rate_min}% – {m.interest_rate_max}% p.a.</div>}
        </div>
      )}

      {m.required_documents.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-muted-foreground">Required documents</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {m.required_documents.map((d) => (
              <span key={d} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">{d}</span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {m.phone && <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-accent"><Phone className="h-3.5 w-3.5" />Call</a>}
        {waNumber && <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}
        {m.email && <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-accent"><Mail className="h-3.5 w-3.5" />Email</a>}
        {m.website && <a href={m.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-accent"><ExternalLink className="h-3.5 w-3.5" />Website</a>}
      </div>

      <Button className="mt-3 w-full" onClick={onApply}>
        <FileUp className="mr-2 h-4 w-4" />Apply / Send Documents
      </Button>
    </div>
  );
}
