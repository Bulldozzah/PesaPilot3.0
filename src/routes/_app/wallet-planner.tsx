import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownRight, PiggyBank, Target, AlertCircle, Pencil, Trash2, Plus, Settings2 } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/wallet-planner")({ component: WalletPlanner });

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const FREQS = ["Monthly","Weekly","Yearly","One-time"] as const;
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316"];
const DEFAULT_CATS = ["Housing","Transportation","Food","Utilities","Healthcare","Insurance","Debt Payments","Entertainment","Clothing","Personal Care","Education","Gifts","Savings","Investments","Childcare","Pet Care","Travel","Other"];

type Income = { id: string; source: string; amount: number; frequency: string; month: number; year: number };
type Expense = { id: string; category: string; amount: number; expense_date: string; description: string | null };
type Budget = { id: string; category: string; limit_amount: number; month: number; year: number };
type Goal = { id: string; name: string; target_amount: number; current_amount: number; deadline: string | null; month: number | null; year: number | null };
type Cat = { id: string; name: string; is_default: boolean };

function WalletPlanner() {
  const { user } = useAuth();
  const money = useMoney();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [prevNet, setPrevNet] = useState(0);
  const [carryoverExists, setCarryoverExists] = useState(false);

  const monthStart = new Date(year, month - 1, 1).toISOString().slice(0,10);
  const monthEnd = new Date(year, month, 0).toISOString().slice(0,10);

  const load = async () => {
    if (!user) return;
    const [{ data: inc }, { data: exp }, { data: bud }, { data: gl }, { data: ct }] = await Promise.all([
      supabase.from("personal_income").select("*").eq("user_id", user.id).eq("month", month).eq("year", year),
      supabase.from("personal_expenses").select("*").eq("user_id", user.id).gte("expense_date", monthStart).lte("expense_date", monthEnd).order("expense_date", { ascending: false }),
      supabase.from("personal_budgets").select("*").eq("user_id", user.id).eq("month", month).eq("year", year),
      supabase.from("savings_goals").select("*").eq("user_id", user.id),
      supabase.from("expense_categories").select("*").eq("user_id", user.id).order("name"),
    ]);
    setIncome((inc ?? []) as any);
    setExpenses((exp ?? []) as any);
    setBudgets((bud ?? []) as any);
    setGoals((gl ?? []) as any);
    let categories = (ct ?? []) as Cat[];
    if (categories.length === 0) {
      // Bootstrap defaults for existing users
      await supabase.from("expense_categories").insert(DEFAULT_CATS.map((n) => ({ user_id: user.id, name: n, is_default: true })));
      const { data: ct2 } = await supabase.from("expense_categories").select("*").eq("user_id", user.id).order("name");
      categories = (ct2 ?? []) as Cat[];
    }
    setCats(categories);

    // Previous month net
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    const pStart = new Date(py, pm - 1, 1).toISOString().slice(0,10);
    const pEnd = new Date(py, pm, 0).toISOString().slice(0,10);
    const [{ data: pInc }, { data: pExp }] = await Promise.all([
      supabase.from("personal_income").select("amount,frequency").eq("user_id", user.id).eq("month", pm).eq("year", py),
      supabase.from("personal_expenses").select("amount").eq("user_id", user.id).gte("expense_date", pStart).lte("expense_date", pEnd),
    ]);
    const pIncTotal = (pInc ?? []).reduce((s: number, i: any) => s + normalizeIncome(Number(i.amount), i.frequency), 0);
    const pExpTotal = (pExp ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
    setPrevNet(pIncTotal - pExpTotal);

    const { data: carry } = await supabase.from("personal_income").select("id").eq("user_id", user.id).eq("month", month).eq("year", year).eq("source", "Net Savings Carryover").limit(1);
    setCarryoverExists((carry ?? []).length > 0);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, month, year]);

  const totalIncome = useMemo(() => income.reduce((s, i) => s + normalizeIncome(Number(i.amount), i.frequency), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  const expensesByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) m[e.category] = (m[e.category] ?? 0) + Number(e.amount);
    return m;
  }, [expenses]);

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
  const barData = [...pieData].sort((a, b) => b.value - a.value);

  const dailyData = useMemo(() => {
    const daily: Record<string, number> = {};
    for (const e of expenses) daily[e.expense_date] = (daily[e.expense_date] ?? 0) + Number(e.amount);
    const last = new Date(year, month, 0).getDate();
    return Array.from({ length: last }, (_, i) => {
      const d = new Date(year, month - 1, i + 1).toISOString().slice(0,10);
      return { day: i + 1, amount: daily[d] ?? 0 };
    });
  }, [expenses, month, year]);

  const transferCarryover = async () => {
    if (!user || prevNet <= 0 || carryoverExists) return;
    const { error } = await supabase.from("personal_income").insert({
      user_id: user.id, month, year, source: "Net Savings Carryover", amount: prevNet, frequency: "One-time",
    });
    if (error) return toast.error(error.message);
    toast.success("Carryover transferred"); load();
  };

  return (
    <div>
      <PageHeader title="Personal Wallet Planner 💰" subtitle="Manage your personal income, expenses, and budgets." />

      {/* Month selector */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 flex flex-wrap items-end gap-4">
        <div className="grid gap-1"><Label>Month</Label>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1"><Label>Year</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-sm text-right">
          <div className="text-muted-foreground">Previous month net savings</div>
          <div className={`font-display text-xl ${prevNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{money(prevNet)}</div>
          {prevNet > 0 && (carryoverExists
            ? <Badge variant="secondary" className="mt-1">✓ Transferred</Badge>
            : <Button size="sm" className="mt-1" onClick={transferCarryover}>Transfer to this month</Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard label="Monthly Income" value={money(totalIncome)} icon={<ArrowUpRight className="h-5 w-5" />} tone="emerald" />
        <SummaryCard label="Total Expenses" value={money(totalExpenses)} icon={<ArrowDownRight className="h-5 w-5" />} tone="rose" />
        <SummaryCard label="Net Savings" value={money(netSavings)} sub={`${savingsRate.toFixed(1)}% savings rate`} icon={<PiggyBank className="h-5 w-5" />} tone={netSavings >= 0 ? "blue" : "rose"} />
        <SummaryCard label="Savings Goals" value={String(goals.length)} sub={money(goals.reduce((s, g) => s + Number(g.current_amount), 0)) + " saved"} icon={<Target className="h-5 w-5" />} tone="purple" />
      </div>

      {/* Income + Expenses */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <IncomeSection items={income} onChange={load} userId={user?.id} month={month} year={year} total={totalIncome} />
        <ExpensesSection items={expenses} onChange={load} userId={user?.id} cats={cats} setCats={setCats} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <ChartCard title="Expense Breakdown">
          {pieData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label={(e: any) => `${((e.percent ?? 0) * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => money(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Expenses by Category">
          {barData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} interval={0} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => money(Number(v))} />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Daily Expense Trend" className="mb-6">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(v: any) => money(Number(v))} />
            <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <BudgetSection items={budgets} expensesByCategory={expensesByCategory} onChange={load} userId={user?.id} month={month} year={year} cats={cats} />

      <GoalsSection items={goals} onChange={load} userId={user?.id} month={month} year={year} />
    </div>
  );
}

function normalizeIncome(amount: number, freq: string) {
  if (freq === "Weekly") return amount * 4;
  if (freq === "Yearly") return amount / 12;
  return amount;
}

function SummaryCard({ label, value, sub, icon, tone }: any) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-950/40",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between"><div className="text-sm text-muted-foreground">{label}</div><div className={`rounded-lg p-2 ${tones[tone]}`}>{icon}</div></div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, className = "" }: any) {
  return <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}><div className="font-display text-lg font-semibold mb-3">{title}</div>{children}</div>;
}

function EmptyChart() { return <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">No data yet</div>; }

/* ---------- INCOME ---------- */
function IncomeSection({ items, onChange, userId, month, year, total }: { items: Income[]; onChange: () => void; userId?: string; month: number; year: number; total: number }) {
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [f, setF] = useState({ source: "", amount: "", frequency: "Monthly" });

  const openNew = () => { setEditing(null); setF({ source: "", amount: "", frequency: "Monthly" }); setOpen(true); };
  const openEdit = (it: Income) => { setEditing(it); setF({ source: it.source, amount: String(it.amount), frequency: it.frequency }); setOpen(true); };

  const save = async () => {
    if (!f.source || !f.amount) return toast.error("Source & amount required");
    if (editing) {
      const { error } = await supabase.from("personal_income").update({ source: f.source, amount: Number(f.amount), frequency: f.frequency }).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      if (!userId) return;
      const { error } = await supabase.from("personal_income").insert({ user_id: userId, source: f.source, amount: Number(f.amount), frequency: f.frequency, month, year });
      if (error) return toast.error(error.message);
    }
    toast.success("Saved"); setOpen(false); onChange();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this income source?")) return;
    await supabase.from("personal_income").delete().eq("id", id); onChange();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-lg font-semibold">Income Sources</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Income Source</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Source</Label><Input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Salary, Freelance, Rental" /></div>
              <div><Label>Amount</Label><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
              <div><Label>Frequency</Label>
                <Select value={f.frequency} onValueChange={(v) => setF({ ...f, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <div className="py-8 text-center text-muted-foreground text-sm">No income sources yet</div> : (
        <div className="divide-y">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between py-3">
              <div><div className="font-medium">{it.source}</div><div className="text-xs text-muted-foreground">{it.frequency}</div></div>
              <div className="flex items-center gap-2">
                <div className="font-display text-emerald-600">{money(it.amount)}</div>
                <Button size="icon" variant="ghost" onClick={() => openEdit(it)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(it.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-3 font-semibold"><span>Total Monthly</span><span className="font-display">{money(total)}</span></div>
        </div>
      )}
    </div>
  );
}

/* ---------- EXPENSES ---------- */
function ExpensesSection({ items, onChange, userId, cats, setCats }: { items: Expense[]; onChange: () => void; userId?: string; cats: Cat[]; setCats: (c: Cat[]) => void }) {
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const today = new Date().toISOString().slice(0,10);
  const [f, setF] = useState({ category: "", amount: "", expense_date: today, description: "" });
  const [catsOpen, setCatsOpen] = useState(false);

  const openNew = () => { setEditing(null); setF({ category: cats[0]?.name ?? "", amount: "", expense_date: today, description: "" }); setOpen(true); };
  const openEdit = (it: Expense) => { setEditing(it); setF({ category: it.category, amount: String(it.amount), expense_date: it.expense_date, description: it.description ?? "" }); setOpen(true); };

  const save = async () => {
    if (!f.category || !f.amount) return toast.error("Category & amount required");
    const payload: any = { category: f.category, amount: Number(f.amount), expense_date: f.expense_date, description: f.description || null };
    if (editing) {
      const { error } = await supabase.from("personal_expenses").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("personal_expenses").insert({ ...payload, user_id: userId });
      if (error) return toast.error(error.message);
    }
    toast.success("Saved"); setOpen(false); onChange();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("personal_expenses").delete().eq("id", id); onChange();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-lg font-semibold">Recent Expenses</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Expense</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label>Category</Label><button type="button" className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => setCatsOpen(true)}><Settings2 className="h-3 w-3" /> Manage</button></div>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <div><Label>Amount</Label><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={f.expense_date} onChange={(e) => setF({ ...f, expense_date: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Optional" /></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {items.length === 0 ? <div className="py-8 text-center text-muted-foreground text-sm">No expenses this month</div> : (
          <div className="divide-y">
            {items.slice(0, 10).map((it) => (
              <div key={it.id} className="flex items-start justify-between py-3 gap-2">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="font-medium">{it.category}</span><Badge variant="outline" className="text-xs">{it.expense_date}</Badge></div>{it.description && <div className="text-xs text-muted-foreground truncate">{it.description}</div>}</div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="font-display text-rose-600">-{money(it.amount)}</div>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(it)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(it.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ManageCategoriesDialog open={catsOpen} onOpenChange={setCatsOpen} cats={cats} setCats={setCats} userId={userId} />
    </div>
  );
}

function ManageCategoriesDialog({ open, onOpenChange, cats, setCats, userId }: any) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Cat | null>(null);
  const reload = async () => { const { data } = await supabase.from("expense_categories").select("*").eq("user_id", userId).order("name"); setCats((data ?? []) as Cat[]); };

  const submit = async () => {
    if (!name.trim()) return;
    if (editing) {
      const { error } = await supabase.from("expense_categories").update({ name }).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("expense_categories").insert({ user_id: userId, name, is_default: false });
      if (error) return toast.error(error.message);
    }
    setName(""); setEditing(null); reload();
  };

  const del = async (c: Cat) => {
    if (c.is_default) return toast.error("Default categories can't be deleted");
    if (!confirm(`Delete category "${c.name}"?`)) return;
    const { error } = await supabase.from("expense_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Manage Expense Categories</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
          <Button onClick={submit}>{editing ? "Update" : "Add"}</Button>
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setName(""); }}>Cancel</Button>}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y">
          {cats.map((c: Cat) => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2"><span>{c.name}</span>{c.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}</div>
              {!c.is_default && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setName(c.name); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(c)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- BUDGETS ---------- */
function BudgetSection({ items, expensesByCategory, onChange, userId, month, year, cats }: any) {
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: "", limit_amount: "" });
  const usedCategories = new Set(items.map((b: Budget) => b.category));
  const available = cats.filter((c: Cat) => !usedCategories.has(c.name));

  const save = async () => {
    if (!f.category || !f.limit_amount) return toast.error("Fill all fields");
    const { error } = await supabase.from("personal_budgets").insert({ user_id: userId, category: f.category, limit_amount: Number(f.limit_amount), month, year });
    if (error) return toast.error(error.message);
    toast.success("Budget added"); setOpen(false); setF({ category: "", limit_amount: "" }); onChange();
  };
  const del = async (id: string) => { if (!confirm("Delete budget?")) return; await supabase.from("personal_budgets").delete().eq("id", id); onChange(); };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-lg font-semibold">Budget Tracking</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Budget</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Budget for {MONTHS[month - 1]}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Category</Label>
                <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{available.map((c: Cat) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Budget Limit</Label><Input type="number" value={f.limit_amount} onChange={(e) => setF({ ...f, limit_amount: e.target.value })} /></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <div className="py-8 text-center text-muted-foreground text-sm">No budgets set for this month</div> : (
        <div className="space-y-4">
          {items.map((b: Budget) => {
            const spent = expensesByCategory[b.category] ?? 0;
            const pct = (spent / Number(b.limit_amount)) * 100;
            const tone = pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <div key={b.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-medium">{b.category}{pct >= 80 && <AlertCircle className={`h-4 w-4 ${pct >= 100 ? "text-rose-500" : "text-amber-500"}`} />}</div>
                  <div className="flex items-center gap-2 text-sm"><span>{money(spent)} / {money(b.limit_amount)}</span><Button size="icon" variant="ghost" onClick={() => del(b.id)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden"><div className={`h-full ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{pct.toFixed(0)}% used</span><span>{money(Math.max(0, Number(b.limit_amount) - spent))} remaining</span></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- GOALS ---------- */
function GoalsSection({ items, onChange, userId, month, year }: any) {
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", target_amount: "", current_amount: "0", deadline: "" });

  const save = async () => {
    if (!f.name || !f.target_amount) return toast.error("Name & target required");
    const { error } = await supabase.from("savings_goals").insert({
      user_id: userId, name: f.name, target_amount: Number(f.target_amount), current_amount: Number(f.current_amount) || 0,
      deadline: f.deadline || null, month, year,
    });
    if (error) return toast.error(error.message);
    toast.success("Goal created"); setOpen(false); setF({ name: "", target_amount: "", current_amount: "0", deadline: "" }); onChange();
  };
  const updateAmount = async (g: Goal) => {
    const v = prompt(`Update current amount for "${g.name}":`, String(g.current_amount));
    if (v === null) return;
    const n = Number(v);
    if (Number.isNaN(n)) return toast.error("Invalid number");
    await supabase.from("savings_goals").update({ current_amount: n }).eq("id", g.id); onChange();
  };
  const del = async (id: string) => { if (!confirm("Delete goal?")) return; await supabase.from("savings_goals").delete().eq("id", id); onChange(); };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-lg font-semibold">Savings Goals</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Goal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Savings Goal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Goal Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Emergency Fund, Vacation, New Car" /></div>
              <div><Label>Target Amount</Label><Input type="number" value={f.target_amount} onChange={(e) => setF({ ...f, target_amount: e.target.value })} /></div>
              <div><Label>Current Amount</Label><Input type="number" value={f.current_amount} onChange={(e) => setF({ ...f, current_amount: e.target.value })} /></div>
              <div><Label>Deadline</Label><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <div className="py-8 text-center text-muted-foreground text-sm">No savings goals yet</div> : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((g: Goal) => {
            const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
            const done = pct >= 100;
            return (
              <div key={g.id} className="rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 p-4">
                <div className="flex items-start justify-between"><div className="font-display font-semibold">{g.name}</div>
                  <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => updateAmount(g)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => del(g.id)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
                <div className="mt-1 text-sm">{money(g.current_amount)} <span className="text-muted-foreground">/ {money(g.target_amount)}</span></div>
                <Progress value={pct} className={`mt-2 ${done ? "[&>div]:bg-emerald-500" : "[&>div]:bg-purple-500"}`} />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{pct.toFixed(0)}% complete</span>{g.deadline && <span>by {g.deadline}</span>}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
