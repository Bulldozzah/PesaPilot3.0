import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/accounting/reports")({ component: Reports });

type Line = { account_id: string; debit: number; credit: number; account: { code: string; name: string; type: string } };

function Reports() {
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("journal_lines").select("account_id, debit, credit, chart_of_accounts(code,name,type)");
      setLines((data ?? []).map((l: any) => ({ ...l, debit: Number(l.debit), credit: Number(l.credit), account: l.chart_of_accounts })));
    })();
  }, []);

  const byAccount = useMemo(() => {
    const m = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>();
    for (const l of lines) {
      if (!l.account) continue;
      const k = l.account.code + "|" + l.account.name;
      const prev = m.get(k) ?? { code: l.account.code, name: l.account.name, type: l.account.type, debit: 0, credit: 0 };
      prev.debit += l.debit; prev.credit += l.credit;
      m.set(k, prev);
    }
    return Array.from(m.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [lines]);

  const balance = (type: string) => byAccount.filter((a) => a.type === type).reduce((s, a) => {
    if (type === "asset" || type === "expense") return s + (a.debit - a.credit);
    return s + (a.credit - a.debit);
  }, 0);

  const income = balance("income");
  const expense = balance("expense");
  const profit = income - expense;
  const assets = balance("asset");
  const liabilities = balance("liability");
  const equity = balance("equity");

  return (
    <div>
      <PageHeader title="Financial Reports" subtitle="Auto-generated from your journal entries." />
      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">P&L</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
          <TabsTrigger value="tb">Trial Balance</TabsTrigger>
          <TabsTrigger value="gl">General Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="pl" className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Income Statement (P&L)</h3>
          <Section title="Revenue" rows={byAccount.filter((a) => a.type === "income").map((a) => ({ label: `${a.code} — ${a.name}`, value: a.credit - a.debit }))} total={income} />
          <Section title="Expenses" rows={byAccount.filter((a) => a.type === "expense").map((a) => ({ label: `${a.code} — ${a.name}`, value: a.debit - a.credit }))} total={expense} />
          <Row label="Net Profit" value={profit} bold accent={profit >= 0 ? "success" : "destructive"} />
        </TabsContent>

        <TabsContent value="bs" className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Balance Sheet</h3>
          <Section title="Assets" rows={byAccount.filter((a) => a.type === "asset").map((a) => ({ label: `${a.code} — ${a.name}`, value: a.debit - a.credit }))} total={assets} />
          <Section title="Liabilities" rows={byAccount.filter((a) => a.type === "liability").map((a) => ({ label: `${a.code} — ${a.name}`, value: a.credit - a.debit }))} total={liabilities} />
          <Section title="Equity (incl. retained earnings)" rows={[...byAccount.filter((a) => a.type === "equity").map((a) => ({ label: `${a.code} — ${a.name}`, value: a.credit - a.debit })), { label: "Retained earnings (P&L)", value: profit }]} total={equity + profit} />
          <Row label="Liabilities + Equity" value={liabilities + equity + profit} bold />
        </TabsContent>

        <TabsContent value="cf" className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Cash Flow (simplified)</h3>
          <p className="mt-1 text-sm text-muted-foreground">Net movement in Cash + Bank accounts.</p>
          <Row label="Cash & Bank balance" value={byAccount.filter((a) => ["1000","1010"].includes(a.code)).reduce((s, a) => s + (a.debit - a.credit), 0)} bold />
        </TabsContent>

        <TabsContent value="tb" className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Trial Balance</h3>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
            <tbody>
              {byAccount.map((a) => (
                <tr key={a.code} className="border-b border-border/50"><td className="py-2">{a.code} — {a.name}</td><td className="text-right">{formatMoney(a.debit)}</td><td className="text-right">{formatMoney(a.credit)}</td></tr>
              ))}
              <tr className="font-bold"><td className="py-2">Totals</td><td className="text-right">{formatMoney(byAccount.reduce((s,a)=>s+a.debit,0))}</td><td className="text-right">{formatMoney(byAccount.reduce((s,a)=>s+a.credit,0))}</td></tr>
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="gl" className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">General Ledger Summary</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {byAccount.map((a) => (
              <div key={a.code} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span>{a.code} — {a.name} <span className="text-xs text-muted-foreground">({a.type})</span></span>
                <span className="font-medium">{formatMoney(a.debit - a.credit)}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, rows, total }: { title: string; rows: { label: string; value: number }[]; total: number }) {
  return (
    <div className="mt-4">
      <div className="text-sm font-semibold text-muted-foreground">{title}</div>
      {rows.filter((r) => r.value !== 0).map((r) => <Row key={r.label} label={r.label} value={r.value} />)}
      <Row label={`Total ${title}`} value={total} bold />
    </div>
  );
}
function Row({ label, value, bold, accent }: { label: string; value: number; bold?: boolean; accent?: "success" | "destructive" }) {
  const c = accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "";
  return <div className={`flex items-center justify-between border-b border-border/50 py-1.5 text-sm ${bold ? "font-bold" : ""} ${c}`}><span>{label}</span><span>{formatMoney(value)}</span></div>;
}
