import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, FileText, Scale, DollarSign, TrendingUp, TrendingDown,
  List, Calculator, Receipt, CreditCard, Users, Printer, Building2,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/accounting/reports")({ component: ReportsPage });

type Account = {
  id: string; code: string; name: string; type: string;
  account_type: string | null; subcategory: string | null; is_active: boolean;
};
type JLine = {
  id: string; account_id: string; debit: number; credit: number;
  vendor_id: string | null; customer_id: string | null;
  chart_of_accounts?: { code: string; name: string; type: string; account_type: string | null } | null;
};
type JEntry = {
  id: string; entry_date: string; reference: string | null; description: string | null;
  is_posted: boolean; journal_lines: JLine[];
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];

const REPORTS = [
  { group: "Financial Statements", items: [
    { id: "income", name: "Income Statement (P&L)", icon: TrendingUp },
    { id: "balance", name: "Balance Sheet", icon: Scale },
    { id: "cashflow", name: "Cash Flow Statement", icon: DollarSign },
  ]},
  { group: "Control Reports", items: [
    { id: "trial", name: "Trial Balance", icon: Calculator },
    { id: "ledger", name: "General Ledger", icon: List },
    { id: "journal", name: "Journal Report", icon: FileText },
  ]},
  { group: "Management Reports", items: [
    { id: "expense", name: "Expense Analysis", icon: TrendingDown },
    { id: "revenue", name: "Revenue Analysis", icon: TrendingUp },
    { id: "ap", name: "A/P Aging", icon: CreditCard },
    { id: "ar", name: "A/R Aging", icon: Users },
  ]},
  { group: "Tax & Compliance", items: [
    { id: "tax", name: "Tax Summary", icon: Receipt },
  ]},
];

const isIncome = (t: string) => t === "income" || t === "revenue";
const isExpense = (t: string) => t === "expense" || t === "cogs";
const isCreditNormal = (t: string) => isIncome(t) || t === "liability" || t === "equity";

function ReportsPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const y = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${y}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [activeReport, setActiveReport] = useState("income");

  useEffect(() => {
    if (!user) return;
    supabase.from("user_businesses").select("id,name").order("created_at").then(({ data }) => {
      const list = (data ?? []) as { id: string; name: string }[];
      setBusinesses(list);
      if (list.length && !businessId) setBusinessId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      supabase.from("chart_of_accounts").select("*").eq("user_business_id", businessId).order("code"),
      supabase.from("journal_entries")
        .select("*, journal_lines(*, chart_of_accounts(code,name,type,account_type))")
        .eq("user_business_id", businessId).eq("is_posted", true)
        .order("entry_date", { ascending: true }),
    ]).then(([a, j]) => {
      setAccounts((a.data as Account[]) ?? []);
      setEntries((j.data as JEntry[]) ?? []);
      setLoading(false);
    });
  }, [businessId]);

  // Helpers
  const balanceUpTo = (accountId: string, upTo?: string) => {
    let d = 0, c = 0;
    for (const e of entries) {
      if (upTo && e.entry_date > upTo) continue;
      for (const l of e.journal_lines ?? []) {
        if (l.account_id !== accountId) continue;
        d += Number(l.debit) || 0; c += Number(l.credit) || 0;
      }
    }
    return { debit: d, credit: c, balance: d - c };
  };
  const balanceInRange = (accountId: string, from: string, to: string) => {
    let d = 0, c = 0;
    for (const e of entries) {
      if (e.entry_date < from || e.entry_date > to) continue;
      for (const l of e.journal_lines ?? []) {
        if (l.account_id !== accountId) continue;
        d += Number(l.debit) || 0; c += Number(l.credit) || 0;
      }
    }
    return { debit: d, credit: c, balance: d - c };
  };

  return (
    <div>
      <PageHeader
        title="Account Reports"
        subtitle="Financial statements and analysis derived from your double-entry books."
        action={
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select business" /></SelectTrigger>
              <SelectContent>
                {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Report category selectors */}
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4 print:hidden">
        {REPORTS.map((cat) => {
          const isActiveCat = cat.items.some((r) => r.id === activeReport);
          return (
            <div key={cat.group} className={`rounded-xl border bg-card p-3 ${isActiveCat ? "ring-2 ring-primary" : "border-border"}`}>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{cat.group}</div>
              <Select value={isActiveCat ? activeReport : ""} onValueChange={setActiveReport}>
                <SelectTrigger><SelectValue placeholder="Select report" /></SelectTrigger>
                <SelectContent>
                  {cat.items.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {!businessId ? (
          <Empty msg="Select a business to view reports." />
        ) : loading ? (
          <Empty msg="Loading…" />
        ) : !accounts.length ? (
          <Empty msg="No accounts yet. Initialize your Chart of Accounts first." />
        ) : (
          <ReportRender
            id={activeReport} accounts={accounts} entries={entries}
            startDate={startDate} endDate={endDate}
            balanceUpTo={balanceUpTo} balanceInRange={balanceInRange}
          />
        )}
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="py-16 text-center text-muted-foreground">{msg}</div>;
}

type RenderProps = {
  id: string; accounts: Account[]; entries: JEntry[];
  startDate: string; endDate: string;
  balanceUpTo: (id: string, upTo?: string) => { debit: number; credit: number; balance: number };
  balanceInRange: (id: string, from: string, to: string) => { debit: number; credit: number; balance: number };
};

function ReportRender(p: RenderProps) {
  switch (p.id) {
    case "income": return <IncomeStatement {...p} />;
    case "balance": return <BalanceSheet {...p} />;
    case "cashflow": return <CashFlow {...p} />;
    case "trial": return <TrialBalanceReport {...p} />;
    case "ledger": return <GeneralLedgerReport {...p} />;
    case "journal": return <JournalReport {...p} />;
    case "expense": return <ExpenseAnalysis {...p} />;
    case "revenue": return <RevenueAnalysis {...p} />;
    case "ap": return <AgingReport {...p} kind="ap" />;
    case "ar": return <AgingReport {...p} kind="ar" />;
    case "tax": return <TaxSummary {...p} />;
    default: return null;
  }
}

// ============ INCOME STATEMENT ============
function IncomeStatement({ accounts, startDate, endDate, balanceInRange }: RenderProps) {
  const money = useMoney();
  const rev = accounts.filter((a) => isIncome(a.type));
  const cogs = accounts.filter((a) => a.type === "cogs");
  const exp = accounts.filter((a) => a.type === "expense");

  const revRows = rev.map((a) => ({ a, v: Math.abs(balanceInRange(a.id, startDate, endDate).balance) })).filter((r) => r.v > 0);
  const cogsRows = cogs.map((a) => ({ a, v: Math.abs(balanceInRange(a.id, startDate, endDate).balance) })).filter((r) => r.v > 0);
  const expRows = exp.map((a) => ({ a, v: Math.abs(balanceInRange(a.id, startDate, endDate).balance) })).filter((r) => r.v > 0);

  const totalRev = revRows.reduce((s, r) => s + r.v, 0);
  const totalCogs = cogsRows.reduce((s, r) => s + r.v, 0);
  const totalExp = expRows.reduce((s, r) => s + r.v, 0);
  const grossProfit = totalRev - totalCogs;
  const netIncome = grossProfit - totalExp;

  const chartData = [
    { name: "Revenue", value: totalRev },
    { name: "COGS", value: totalCogs },
    { name: "Expenses", value: totalExp },
    { name: "Net Income", value: netIncome },
  ];
  const expBreakdown = expRows.map((r) => ({ name: r.a.name, value: r.v }));

  return (
    <div>
      <ReportHeader title="Income Statement (P&L)" period={`${startDate} → ${endDate}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Section title="Revenue" rows={revRows.map((r) => ({ label: `${r.a.code} — ${r.a.name}`, value: r.v }))} total={totalRev} />
          {cogsRows.length > 0 && <Section title="Cost of Goods Sold" rows={cogsRows.map((r) => ({ label: `${r.a.code} — ${r.a.name}`, value: r.v }))} total={totalCogs} />}
          <Row label="Gross Profit" value={grossProfit} bold className="bg-primary/5 px-2 rounded" />
          <Section title="Operating Expenses" rows={expRows.map((r) => ({ label: `${r.a.code} — ${r.a.name}`, value: r.v }))} total={totalExp} />
          <Row label={netIncome >= 0 ? "Net Profit" : "Net Loss"} value={netIncome} bold accent={netIncome >= 0 ? "success" : "destructive"} />
        </div>
        <div className="space-y-6">
          <ChartCard title="P&L Summary">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          {expBreakdown.length > 0 && (
            <ChartCard title="Expense Breakdown">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={expBreakdown} dataKey="value" nameKey="name" outerRadius={90} label>
                    {expBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-1 text-sm">
                {expBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{money(item.value)}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ BALANCE SHEET ============
function BalanceSheet({ accounts, endDate, balanceUpTo, startDate, balanceInRange }: RenderProps) {
  const money = useMoney();
  const assets = accounts.filter((a) => a.type === "asset")
    .map((a) => ({ a, v: balanceUpTo(a.id, endDate).balance })).filter((r) => r.v !== 0);
  const liabilities = accounts.filter((a) => a.type === "liability")
    .map((a) => ({ a, v: -balanceUpTo(a.id, endDate).balance })).filter((r) => r.v !== 0);
  const equity = accounts.filter((a) => a.type === "equity")
    .map((a) => ({ a, v: -balanceUpTo(a.id, endDate).balance })).filter((r) => r.v !== 0);

  // Net income from start..end
  const incomeTotal = accounts.filter((a) => isIncome(a.type))
    .reduce((s, a) => s + Math.abs(balanceInRange(a.id, startDate, endDate).balance), 0);
  const expenseTotal = accounts.filter((a) => isExpense(a.type))
    .reduce((s, a) => s + Math.abs(balanceInRange(a.id, startDate, endDate).balance), 0);
  const netIncome = incomeTotal - expenseTotal;

  const totalAssets = assets.reduce((s, r) => s + r.v, 0);
  const totalLiab = liabilities.reduce((s, r) => s + r.v, 0);
  const totalEquity = equity.reduce((s, r) => s + r.v, 0) + netIncome;
  const balanced = Math.abs(totalAssets - (totalLiab + totalEquity)) < 0.01;

  const chartData = [
    { name: "Assets", value: totalAssets },
    { name: "Liabilities", value: totalLiab },
    { name: "Equity", value: totalEquity },
  ];

  return (
    <div>
      <ReportHeader title="Balance Sheet" period={`As of ${endDate}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Section title="Assets" rows={assets.map((r) => ({ label: `${r.a.code} — ${r.a.name}`, value: r.v }))} total={totalAssets} />
          <Section title="Liabilities" rows={liabilities.map((r) => ({ label: `${r.a.code} — ${r.a.name}`, value: r.v }))} total={totalLiab} />
          <Section title="Equity" rows={[
            ...equity.map((r) => ({ label: `${r.a.code} — ${r.a.name}`, value: r.v })),
            { label: "Current Period Net Income", value: netIncome },
          ]} total={totalEquity} />
          <Row label="Total Liabilities + Equity" value={totalLiab + totalEquity} bold />
          <div className={`mt-2 rounded p-3 text-sm ${balanced ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {balanced ? "✓ Balance sheet balances" : `⚠ Out of balance by ${money(Math.abs(totalAssets - (totalLiab + totalEquity)))}`}
          </div>
        </div>
        <div className="space-y-6">
          <ChartCard title="A = L + E">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          {assets.length > 0 && (
            <ChartCard title="Asset Composition">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={assets.map((r) => ({ name: r.a.name, value: r.v }))} dataKey="value" nameKey="name" outerRadius={90} label>
                    {assets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-1 text-sm">
                {assets.map((r, i) => (
                  <div key={r.a.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{r.a.name}</span>
                    </div>
                    <span className="font-medium">{money(r.v)}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ CASH FLOW ============
function CashFlow({ accounts, entries, startDate, endDate, balanceUpTo }: RenderProps) {
  const money = useMoney();
  const cashAccounts = accounts.filter((a) =>
    a.type === "asset" && (/cash|bank|checking|savings|wallet/i.test(a.name) || /^1[012]/.test(a.code))
  );
  const cashIds = new Set(cashAccounts.map((a) => a.id));

  let opening = 0;
  for (const a of cashAccounts) opening += balanceUpTo(a.id, startDate).balance;

  const buckets = { operating: 0, investing: 0, financing: 0 };
  const inflows: Record<string, { name: string; v: number }[]> = { operating: [], investing: [], financing: [] };
  const outflows: Record<string, { name: string; v: number }[]> = { operating: [], investing: [], financing: [] };

  for (const e of entries) {
    if (e.entry_date < startDate || e.entry_date > endDate) continue;
    const cashLines = (e.journal_lines ?? []).filter((l) => cashIds.has(l.account_id));
    if (cashLines.length === 0 || cashLines.length === (e.journal_lines ?? []).length) continue;
    const net = cashLines.reduce((s, l) => s + (Number(l.debit) - Number(l.credit)), 0);
    if (net === 0) continue;
    const others = (e.journal_lines ?? []).filter((l) => !cashIds.has(l.account_id));
    const other = others[0]?.chart_of_accounts;
    const oname = other?.name ?? "Other";
    const otype = other?.type ?? "";
    let bucket: "operating" | "investing" | "financing" = "operating";
    if (otype === "equity" || /loan|capital|dividend/i.test(oname)) bucket = "financing";
    else if (/equipment|property|machinery|vehicle|building/i.test(oname)) bucket = "investing";
    buckets[bucket] += net;
    (net > 0 ? inflows[bucket] : outflows[bucket]).push({ name: oname, v: Math.abs(net) });
  }

  const closing = opening + buckets.operating + buckets.investing + buckets.financing;
  const chart = [
    { name: "Operating", value: buckets.operating },
    { name: "Investing", value: buckets.investing },
    { name: "Financing", value: buckets.financing },
  ];

  return (
    <div>
      <ReportHeader title="Cash Flow Statement" period={`${startDate} → ${endDate}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Row label="Opening Cash" value={opening} bold />
          {(["operating", "investing", "financing"] as const).map((k, i) => (
            <div key={k} className={`rounded-lg border-l-4 p-3`} style={{ borderColor: COLORS[i] }}>
              <div className="font-semibold capitalize">{i + 1}. {k} Activities</div>
              {inflows[k].map((x, j) => <Row key={`i${j}`} label={`+ ${x.name}`} value={x.v} />)}
              {outflows[k].map((x, j) => <Row key={`o${j}`} label={`− ${x.name}`} value={-x.v} />)}
              <Row label={`Net ${k}`} value={buckets[k]} bold accent={buckets[k] >= 0 ? "success" : "destructive"} />
            </div>
          ))}
          <Row label="Closing Cash" value={closing} bold accent="success" />
        </div>
        <ChartCard title="Cash Flow by Activity">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ============ TRIAL BALANCE ============
function TrialBalanceReport({ accounts, endDate, balanceUpTo }: RenderProps) {
  const money = useMoney();
  const rows = accounts.map((a) => {
    const b = balanceUpTo(a.id, endDate);
    return { a, debit: b.balance > 0 ? b.balance : 0, credit: b.balance < 0 ? -b.balance : 0 };
  }).filter((r) => r.debit !== 0 || r.credit !== 0);

  const td = rows.reduce((s, r) => s + r.debit, 0);
  const tc = rows.reduce((s, r) => s + r.credit, 0);
  const abnormal = (r: { a: Account; debit: number; credit: number }) => {
    if (isCreditNormal(r.a.type) && r.debit > 0) return true;
    if (!isCreditNormal(r.a.type) && r.credit > 0) return true;
    return false;
  };

  return (
    <div>
      <ReportHeader title="Trial Balance" period={`As of ${endDate}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Code</th><th>Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.a.id} className={`border-b border-border/50 ${abnormal(r) ? "bg-amber-500/10" : ""}`}>
                  <td className="py-2 font-mono text-xs">{r.a.code}</td>
                  <td>{r.a.name} {abnormal(r) && <span title="Abnormal balance">⚠️</span>}</td>
                  <td className="text-right">{r.debit ? money(r.debit) : ""}</td>
                  <td className="text-right">{r.credit ? money(r.credit) : ""}</td>
                </tr>
              ))}
              <tr className="font-bold"><td className="py-2" colSpan={2}>Totals</td><td className="text-right">{money(td)}</td><td className="text-right">{money(tc)}</td></tr>
            </tbody>
          </table>
          <div className={`mt-3 rounded p-3 text-sm ${Math.abs(td - tc) < 0.01 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {Math.abs(td - tc) < 0.01 ? "✓ Trial balance is balanced" : `⚠ Out of balance by ${money(Math.abs(td - tc))}`}
          </div>
        </div>
        <ChartCard title="Top Balances">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rows.slice(0, 8).map((r) => ({ name: r.a.code, value: r.debit + r.credit }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" /><YAxis dataKey="name" type="category" width={60} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ============ GENERAL LEDGER ============
function GeneralLedgerReport({ accounts, entries, startDate, endDate }: RenderProps) {
  const money = useMoney();
  const data = accounts.map((a) => {
    const lines: { date: string; desc: string; debit: number; credit: number; balance: number }[] = [];
    let bal = 0;
    const sorted = [...entries].sort((x, y) => x.entry_date.localeCompare(y.entry_date));
    for (const e of sorted) {
      if (e.entry_date < startDate || e.entry_date > endDate) continue;
      for (const l of e.journal_lines ?? []) {
        if (l.account_id !== a.id) continue;
        bal += (Number(l.debit) - Number(l.credit));
        lines.push({ date: e.entry_date, desc: e.description ?? "", debit: Number(l.debit), credit: Number(l.credit), balance: bal });
      }
    }
    return { a, lines, closing: bal };
  }).filter((g) => g.lines.length > 0);

  return (
    <div>
      <ReportHeader title="General Ledger" period={`${startDate} → ${endDate}`} />
      <div className="space-y-4">
        {data.map((g) => (
          <div key={g.a.id} className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">{g.a.code} — {g.a.name}</div>
              <div className="text-sm">Closing: <span className="font-mono">{money(g.closing)}</span></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1">Date</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr></thead>
                <tbody>
                  {g.lines.map((l, i) => (
                    <tr key={i} className="border-b border-border/50"><td className="py-1">{l.date}</td><td>{l.desc}</td><td className="text-right">{l.debit ? money(l.debit) : ""}</td><td className="text-right">{l.credit ? money(l.credit) : ""}</td><td className="text-right font-mono">{money(l.balance)}</td></tr>
                  ))}
                </tbody>
              </table>
              {g.lines.length > 1 && (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={g.lines.map((l) => ({ date: l.date, balance: l.balance }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" /><YAxis /><Tooltip formatter={(v: number) => money(v)} />
                    <Area type="monotone" dataKey="balance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ JOURNAL REPORT ============
function JournalReport({ entries, startDate, endDate }: RenderProps) {
  const money = useMoney();
  const filtered = entries.filter((e) => e.entry_date >= startDate && e.entry_date <= endDate);
  return (
    <div>
      <ReportHeader title="Journal Report" period={`${startDate} → ${endDate}`} />
      <div className="space-y-3">
        {filtered.map((e) => (
          <div key={e.id} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <div><span className="font-semibold">{e.description}</span> {e.reference && <span className="text-muted-foreground">· {e.reference}</span>}</div>
              <div className="text-muted-foreground">{e.entry_date}</div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1">Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
              <tbody>
                {e.journal_lines?.map((l) => (
                  <tr key={l.id} className="border-b border-border/50"><td className="py-1">{l.chart_of_accounts?.code} — {l.chart_of_accounts?.name}</td><td className="text-right">{l.debit ? money(Number(l.debit)) : ""}</td><td className="text-right">{l.credit ? money(Number(l.credit)) : ""}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {!filtered.length && <Empty msg="No journal entries in this date range." />}
      </div>
    </div>
  );
}

// ============ EXPENSE ANALYSIS ============
function ExpenseAnalysis({ accounts, startDate, endDate, balanceInRange }: RenderProps) {
  const money = useMoney();
  const totalRev = accounts.filter((a) => isIncome(a.type)).reduce((s, a) => s + Math.abs(balanceInRange(a.id, startDate, endDate).balance), 0);
  const cogs = accounts.filter((a) => a.type === "cogs").map((a) => ({ a, v: Math.abs(balanceInRange(a.id, startDate, endDate).balance) })).filter((r) => r.v > 0);
  const exp = accounts.filter((a) => a.type === "expense").map((a) => ({ a, v: Math.abs(balanceInRange(a.id, startDate, endDate).balance) })).filter((r) => r.v > 0);
  const totalCogs = cogs.reduce((s, r) => s + r.v, 0);
  const totalExp = exp.reduce((s, r) => s + r.v, 0);
  const pct = (v: number) => totalRev > 0 ? `${((v / totalRev) * 100).toFixed(1)}%` : "—";

  return (
    <div>
      <ReportHeader title="Expense Analysis" period={`${startDate} → ${endDate}`} />
      <div className="mb-4 rounded-lg bg-primary/5 p-3 text-sm">Total Revenue Reference: <span className="font-bold">{money(totalRev)}</span></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          {cogs.length > 0 && (
            <>
              <div className="mb-2 text-sm font-semibold">Cost of Sales</div>
              <table className="mb-4 w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1">Account</th><th className="text-right">Amount</th><th className="text-right">% Rev</th></tr></thead>
                <tbody>
                  {cogs.map((r) => <tr key={r.a.id} className="border-b border-border/50"><td className="py-1">{r.a.name}</td><td className="text-right">{money(r.v)}</td><td className="text-right">{pct(r.v)}</td></tr>)}
                </tbody>
              </table>
            </>
          )}
          <div className="mb-2 text-sm font-semibold">Operating Expenses</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1">Account</th><th className="text-right">Amount</th><th className="text-right">% Rev</th><th className="text-right">% Total</th></tr></thead>
            <tbody>
              {exp.map((r) => <tr key={r.a.id} className="border-b border-border/50"><td className="py-1">{r.a.name}</td><td className="text-right">{money(r.v)}</td><td className="text-right">{pct(r.v)}</td><td className="text-right">{totalExp > 0 ? `${((r.v / totalExp) * 100).toFixed(1)}%` : "—"}</td></tr>)}
              <tr className="font-bold"><td className="py-1">Total</td><td className="text-right">{money(totalExp)}</td><td className="text-right">{pct(totalExp)}</td><td></td></tr>
            </tbody>
          </table>
        </div>
        <div className="space-y-6">
          <ChartCard title="Expense Breakdown">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={exp.map((r) => ({ name: r.a.name, value: r.v }))}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis /><Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Total Cost Distribution">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={[...cogs, ...exp].map((r) => ({ name: r.a.name, value: r.v }))} dataKey="value" nameKey="name" outerRadius={90}>
                  {[...cogs, ...exp].map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-1 text-sm">
              {[...cogs, ...exp].map((r, i) => (
                <div key={r.a.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{r.a.name}</span>
                  </div>
                  <span className="font-medium">{money(r.v)}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

// ============ REVENUE ANALYSIS ============
function RevenueAnalysis({ accounts, startDate, endDate, balanceInRange, entries }: RenderProps) {
  const money = useMoney();
  const revAccts = accounts.filter((a) => isIncome(a.type));
  const total = revAccts.reduce((s, a) => s + Math.abs(balanceInRange(a.id, startDate, endDate).balance), 0);

  // 12-month trend
  const end = new Date(endDate);
  const months: { label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    let v = 0;
    for (const a of revAccts) v += Math.abs(balanceInRange(a.id, from, to).balance);
    months.push({ label: from.slice(0, 7), value: v });
  }
  const current = months[months.length - 1]?.value ?? 0;
  const prev = months[months.length - 2]?.value ?? 0;
  const mom = prev > 0 ? ((current - prev) / prev) * 100 : 0;
  const avg = months.reduce((s, m) => s + m.value, 0) / 12;
  const variance = current - avg;

  const bySource = revAccts.map((a) => ({ name: a.name, value: Math.abs(balanceInRange(a.id, startDate, endDate).balance) })).filter((x) => x.value > 0);

  return (
    <div>
      <ReportHeader title="Revenue Analysis" period={`${startDate} → ${endDate}`} />
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <StatCard label="Total Revenue" value={money(total)} />
        <StatCard label="Current Month" value={money(current)} />
        <StatCard label="MoM Growth" value={`${mom.toFixed(1)}%`} accent={mom >= 0 ? "success" : "destructive"} />
        <StatCard label="vs 12mo Avg" value={money(variance)} accent={variance >= 0 ? "success" : "destructive"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="12-Month Revenue Trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={months}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" /><YAxis /><Tooltip formatter={(v: number) => money(v)} />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue by Source">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={bySource} dataKey="value" nameKey="name" outerRadius={90} label>
                {bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => money(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-1 text-sm">
            {bySource.map((r, i) => (
              <div key={r.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span>{r.name}</span>
                </div>
                <span className="font-medium">{money(r.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
      <div className="mt-6">
        <div className="mb-2 text-sm font-semibold">Revenue Sources</div>
        {bySource.map((r) => (
          <div key={r.name} className="mb-2">
            <div className="flex justify-between text-sm"><span>{r.name}</span><span>{money(r.value)} · {total > 0 ? ((r.value / total) * 100).toFixed(1) : 0}%</span></div>
            <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${total > 0 ? (r.value / total) * 100 : 0}%` }} /></div>
          </div>
        ))}
        {!entries.length && <p className="text-sm text-muted-foreground">No posted entries yet.</p>}
      </div>
    </div>
  );
}

// ============ AGING (AP / AR) ============
function AgingReport({ accounts, entries, endDate, kind }: RenderProps & { kind: "ap" | "ar" }) {
  const money = useMoney();
  const account = accounts.find((a) => kind === "ap"
    ? /accounts? payable|\bpayable\b/i.test(a.name)
    : /accounts? receivable|\breceivable\b/i.test(a.name));
  if (!account) return <Empty msg={`No ${kind === "ap" ? "Accounts Payable" : "Accounts Receivable"} account found in your Chart of Accounts.`} />;

  // Collect transactions on this account
  const txns: { date: string; desc: string; contact: string; charge: number; payment: number }[] = [];
  for (const e of entries) {
    if (e.entry_date > endDate) continue;
    for (const l of e.journal_lines ?? []) {
      if (l.account_id !== account.id) continue;
      const debit = Number(l.debit), credit = Number(l.credit);
      if (kind === "ap") {
        // credit = purchase (liability up), debit = payment
        txns.push({ date: e.entry_date, desc: e.description ?? "", contact: "", charge: credit, payment: debit });
      } else {
        // debit = invoice, credit = collection
        txns.push({ date: e.entry_date, desc: e.description ?? "", contact: "", charge: debit, payment: credit });
      }
    }
  }
  txns.sort((a, b) => a.date.localeCompare(b.date));

  // FIFO outstanding
  const outstanding: { date: string; desc: string; remaining: number }[] = [];
  let paymentPool = 0;
  for (const t of txns) {
    if (t.charge > 0) outstanding.push({ date: t.date, desc: t.desc, remaining: t.charge });
    if (t.payment > 0) paymentPool += t.payment;
  }
  for (const o of outstanding) {
    if (paymentPool <= 0) break;
    const apply = Math.min(o.remaining, paymentPool);
    o.remaining -= apply; paymentPool -= apply;
  }
  const open = outstanding.filter((o) => o.remaining > 0.01);

  const today = new Date(endDate);
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, "120+": 0 };
  for (const o of open) {
    const days = Math.floor((today.getTime() - new Date(o.date).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 30) buckets["0-30"] += o.remaining;
    else if (days <= 60) buckets["31-60"] += o.remaining;
    else if (days <= 90) buckets["61-90"] += o.remaining;
    else if (days <= 120) buckets["91-120"] += o.remaining;
    else buckets["120+"] += o.remaining;
  }
  const bucketData = Object.entries(buckets).map(([name, value]) => ({ name, value }));
  const total = bucketData.reduce((s, b) => s + b.value, 0);

  return (
    <div>
      <ReportHeader title={kind === "ap" ? "Accounts Payable Aging" : "Accounts Receivable Aging"} period={`As of ${endDate}`} />
      <div className="mb-4 rounded-lg bg-primary/5 p-3 text-sm">Total Outstanding: <span className="font-bold">{money(total)}</span></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-semibold">Aging Buckets</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1">Bucket (days)</th><th className="text-right">Amount</th></tr></thead>
            <tbody>{bucketData.map((b) => <tr key={b.name} className="border-b border-border/50"><td className="py-1">{b.name}</td><td className="text-right">{money(b.value)}</td></tr>)}</tbody>
          </table>
          <div className="mt-6 mb-2 text-sm font-semibold">Outstanding {kind === "ap" ? "Purchases" : "Invoices"}</div>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1">Date</th><th>Description</th><th className="text-right">Remaining</th></tr></thead>
            <tbody>{open.map((o, i) => <tr key={i} className="border-b border-border/50"><td className="py-1">{o.date}</td><td>{o.desc}</td><td className="text-right">{money(o.remaining)}</td></tr>)}</tbody>
          </table>
        </div>
        <ChartCard title="Aging Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bucketData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" /><YAxis dataKey="name" type="category" width={80} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ============ TAX SUMMARY ============
function TaxSummary({ accounts, startDate, endDate, balanceInRange }: RenderProps) {
  const money = useMoney();
  const rev = accounts.filter((a) => isIncome(a.type)).reduce((s, a) => s + Math.abs(balanceInRange(a.id, startDate, endDate).balance), 0);
  const cogs = accounts.filter((a) => a.type === "cogs").reduce((s, a) => s + Math.abs(balanceInRange(a.id, startDate, endDate).balance), 0);
  const exp = accounts.filter((a) => a.type === "expense").reduce((s, a) => s + Math.abs(balanceInRange(a.id, startDate, endDate).balance), 0);
  const grossProfit = rev - cogs;
  const taxable = grossProfit - exp;
  const tax = Math.max(0, taxable * 0.3);
  const chart = [
    { name: "Revenue", value: rev },
    { name: "COGS", value: cogs },
    { name: "Gross Profit", value: grossProfit },
    { name: "Expenses", value: exp },
    { name: "Taxable", value: taxable },
    { name: "Tax (30%)", value: tax },
  ];
  return (
    <div>
      <ReportHeader title="Tax Summary" period={`${startDate} → ${endDate}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Row label="Revenue" value={rev} />
          <Row label="Less: COGS" value={-cogs} />
          <Row label="Gross Profit" value={grossProfit} bold />
          <Row label="Less: Operating Expenses" value={-exp} />
          <Row label="Taxable Income" value={taxable} bold />
          <Row label="Estimated Tax (30%)" value={tax} bold accent="destructive" />
        </div>
        <ChartCard title="Tax Computation">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ============ UI BITS ============
function ReportHeader({ title, period }: { title: string; period: string }) {
  return (
    <div className="mb-4 border-b border-border pb-3">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{period}</p>
    </div>
  );
}
function Section({ title, rows, total }: { title: string; rows: { label: string; value: number }[]; total: number }) {
  return (
    <div className="mt-4">
      <div className="text-sm font-semibold text-muted-foreground">{title}</div>
      {rows.length === 0 && <p className="py-1 text-sm text-muted-foreground/70">No items</p>}
      {rows.map((r, i) => <Row key={i} label={r.label} value={r.value} />)}
      <Row label={`Total ${title}`} value={total} bold />
    </div>
  );
}
function Row({ label, value, bold, accent, className }: { label: string; value: number; bold?: boolean; accent?: "success" | "destructive"; className?: string }) {
  const money = useMoney();
  const c = accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "";
  return (
    <div className={`flex items-center justify-between border-b border-border/40 py-1.5 text-sm ${bold ? "font-bold" : ""} ${c} ${className ?? ""}`}>
      <span>{label}</span><span className="font-mono">{money(value)}</span>
    </div>
  );
}
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}
function StatCard({ label, value, accent }: { label: string; value: string; accent?: "success" | "destructive" }) {
  const c = accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "";
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold ${c}`}>{value}</div>
    </div>
  );
}
