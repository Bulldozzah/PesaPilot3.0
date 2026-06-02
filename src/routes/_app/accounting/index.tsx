import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Scale, FileText, List, BookOpen, Plus, Trash2, Check,
  Upload, X, ArrowUp, ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/format";
import {
  ACCOUNT_TYPE_GROUPS, ACCOUNT_TYPE_PREFIXES, DEFAULT_CHART_OF_ACCOUNTS,
  DEFAULT_SUBCATEGORIES, ENUM_TO_TYPE, TYPE_TO_ENUM, isCreditNormal,
  type AccountTypeLabel,
} from "@/lib/default-coa";

export const Route = createFileRoute("/_app/accounting/")({ component: AccountingPage });

type Account = {
  id: string; code: string; name: string; type: string;
  account_type: string | null; subcategory: string | null;
  is_active: boolean; user_business_id: string | null;
};
type Subcat = { id: string; account_type: string; name: string; is_system: boolean; display_order: number };
type Contact = { id: string; name: string };
type JLine = {
  id: string; account_id: string; debit: number; credit: number;
  memo: string | null; vendor_id: string | null; customer_id: string | null;
  transaction_type: string | null; tax_amount: number | null;
  chart_of_accounts?: { code: string; name: string; account_type: string | null; type: string } | null;
};
type JEntry = {
  id: string; entry_date: string; reference: string | null; description: string | null;
  is_posted: boolean; user_business_id: string | null; journal_lines: JLine[];
};

const TYPE_COLOR: Record<string, string> = {
  Asset: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Liability: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  Equity: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  Revenue: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  COGS: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  Expense: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  "Other Income": "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "Other Expense": "bg-pink-500/15 text-pink-700 dark:text-pink-400",
};

const labelFor = (a: Account): AccountTypeLabel => {
  if (a.account_type && (a.account_type as AccountTypeLabel) in ACCOUNT_TYPE_PREFIXES) {
    return a.account_type as AccountTypeLabel;
  }
  return (ENUM_TO_TYPE[a.type] as AccountTypeLabel) ?? "Asset";
};

function AccountingPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [businessId, setBusinessId] = useState<string>("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subcats, setSubcats] = useState<Subcat[]>([]);
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [entries, setEntries] = useState<JEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_businesses").select("id,name").order("created_at")
      .then(({ data }) => {
        const list = (data ?? []) as { id: string; name: string }[];
        setBusinesses(list);
        if (list.length && !businessId) setBusinessId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const reload = async () => {
    if (!businessId) {
      setAccounts([]); setSubcats([]); setVendors([]); setCustomers([]); setEntries([]);
      return;
    }
    const [{ data: a }, { data: s }, { data: v }, { data: c }, { data: e }] = await Promise.all([
      supabase.from("chart_of_accounts").select("*").eq("user_business_id", businessId).order("code"),
      supabase.from("account_subcategories").select("*").eq("user_business_id", businessId).order("display_order"),
      supabase.from("vendors").select("id,vendor_name").eq("user_business_id", businessId).eq("is_active", true).order("vendor_name"),
      supabase.from("customers").select("id,customer_name").eq("user_business_id", businessId).eq("is_active", true).order("customer_name"),
      supabase
        .from("journal_entries")
        .select("*, journal_lines(*, chart_of_accounts(code,name,account_type,type))")
        .eq("user_business_id", businessId)
        .order("entry_date", { ascending: false })
        .limit(200),
    ]);
    setAccounts((a as Account[]) ?? []);
    setSubcats((s as Subcat[]) ?? []);
    setVendors(((v as { id: string; vendor_name: string }[]) ?? []).map((x) => ({ id: x.id, name: x.vendor_name })));
    setCustomers(((c as { id: string; customer_name: string }[]) ?? []).map((x) => ({ id: x.id, name: x.customer_name })));
    setEntries((e as JEntry[]) ?? []);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [businessId]);

  return (
    <div>
      <PageHeader
        title="Double-Entry Accounting"
        subtitle="Manage your chart of accounts, journal entries, and financial reports."
        action={
          <div className="flex items-center gap-2">
            <Link to="/accounting/reports"><Button variant="outline">Financial Reports</Button></Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Label className="text-sm text-muted-foreground">Business</Label>
        <Select value={businessId} onValueChange={setBusinessId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select a business" /></SelectTrigger>
          <SelectContent>
            {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {!businesses.length && (
          <span className="text-sm text-muted-foreground">
            No business yet — <Link to="/my-businesses" className="underline">create one</Link> first.
          </span>
        )}
      </div>

      {businessId ? (
        <Tabs defaultValue="trial">
          <TabsList>
            <TabsTrigger value="trial"><Scale className="mr-2 h-4 w-4" />Trial Balance</TabsTrigger>
            <TabsTrigger value="journal"><FileText className="mr-2 h-4 w-4" />Journal Entries</TabsTrigger>
            <TabsTrigger value="ledger"><List className="mr-2 h-4 w-4" />General Ledger</TabsTrigger>
            <TabsTrigger value="coa"><BookOpen className="mr-2 h-4 w-4" />Chart of Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="trial" className="mt-4">
            <TrialBalance accounts={accounts} entries={entries} />
          </TabsContent>

          <TabsContent value="journal" className="mt-4">
            <JournalEntries
              accounts={accounts} entries={entries} vendors={vendors} customers={customers}
              businessId={businessId} userId={user?.id ?? ""} onChange={reload}
            />
          </TabsContent>

          <TabsContent value="ledger" className="mt-4">
            <GeneralLedger accounts={accounts} entries={entries} />
          </TabsContent>

          <TabsContent value="coa" className="mt-4">
            <ChartOfAccountsTab
              accounts={accounts} subcats={subcats} entries={entries}
              businessId={businessId} userId={user?.id ?? ""} onChange={reload}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}

// --------------------- TRIAL BALANCE ---------------------
function TrialBalance({ accounts, entries }: { accounts: Account[]; entries: JEntry[] }) {
  const rows = useMemo(() => {
    const byAcc = new Map<string, { debit: number; credit: number }>();
    entries.filter((e) => e.is_posted).forEach((e) =>
      e.journal_lines?.forEach((l) => {
        const cur = byAcc.get(l.account_id) ?? { debit: 0, credit: 0 };
        cur.debit += Number(l.debit) || 0; cur.credit += Number(l.credit) || 0;
        byAcc.set(l.account_id, cur);
      })
    );
    return accounts
      .map((a) => {
        const t = byAcc.get(a.id) ?? { debit: 0, credit: 0 };
        const net = t.debit - t.credit;
        return {
          account: a, label: labelFor(a),
          displayDebit: net > 0 ? net : 0,
          displayCredit: net < 0 ? -net : 0,
        };
      })
      .filter((r) => r.displayDebit !== 0 || r.displayCredit !== 0)
      .sort((x, y) => x.account.code.localeCompare(y.account.code));
  }, [accounts, entries]);

  const totalDebit = rows.reduce((s, r) => s + r.displayDebit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.displayCredit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  if (!accounts.length) {
    return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
      No accounts yet. Open the Chart of Accounts tab and initialize defaults.
    </div>;
  }
  if (!rows.length) {
    return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
      No posted transactions yet.
    </div>;
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pl-4">Code</th><th>Account</th><th>Type</th>
            <th className="text-right">Debit</th><th className="pr-4 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.account.id} className="border-b border-border/50">
              <td className="py-2 pl-4 font-mono text-xs">{r.account.code}</td>
              <td>{r.account.name}</td>
              <td><span className={`rounded px-2 py-0.5 text-xs ${TYPE_COLOR[r.label]}`}>{r.label}</span></td>
              <td className="text-right">{r.displayDebit ? formatMoney(r.displayDebit) : ""}</td>
              <td className="pr-4 text-right">{r.displayCredit ? formatMoney(r.displayCredit) : ""}</td>
            </tr>
          ))}
          <tr className="bg-muted/50 font-bold">
            <td className="py-2 pl-4" colSpan={3}>Totals</td>
            <td className="text-right">{formatMoney(totalDebit)}</td>
            <td className="pr-4 text-right">{formatMoney(totalCredit)}</td>
          </tr>
        </tbody>
      </table>
      <div className="p-4 text-center text-sm">
        {balanced ? (
          <span className="inline-flex items-center text-success font-medium"><Check className="mr-1 h-4 w-4" />Books are balanced</span>
        ) : (
          <span className="text-destructive font-medium">⚠️ Out of balance by {formatMoney(Math.abs(totalDebit - totalCredit))}</span>
        )}
      </div>
    </div>
  );
}

// --------------------- JOURNAL ENTRIES ---------------------
type LineDraft = {
  account_id: string; memo: string; vendor_id: string; customer_id: string;
  transaction_type: string; tax_amount: string; debit: string; credit: string;
};
const emptyLine = (): LineDraft => ({
  account_id: "", memo: "", vendor_id: "", customer_id: "",
  transaction_type: "", tax_amount: "", debit: "", credit: "",
});

function JournalEntries({
  accounts, entries, vendors, customers, businessId, userId, onChange,
}: {
  accounts: Account[]; entries: JEntry[]; vendors: Contact[]; customers: Contact[];
  businessId: string; userId: string; onChange: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState("");
  const [desc, setDesc] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const accountsByType = useMemo(() => {
    const g: Record<string, Account[]> = {};
    accounts.filter((a) => a.is_active).forEach((a) => {
      const t = labelFor(a);
      (g[t] ??= []).push(a);
    });
    return g;
  }, [accounts]);

  const isAP = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return !!a && /accounts? payable|\ba\/p\b/i.test(a.name);
  };
  const isAR = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return !!a && /accounts? receivable|\ba\/r(ec)?\b/i.test(a.name);
  };

  const updateLine = (i: number, field: keyof LineDraft, value: string) => {
    setLines((prev) => prev.map((l, j) => {
      if (j !== i) return l;
      const next = { ...l, [field]: value };
      if (field === "debit" && value) next.credit = "";
      if (field === "credit" && value) next.debit = "";
      if (field === "account_id") { next.vendor_id = ""; next.customer_id = ""; }
      return next;
    }));
  };

  const reset = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setRef(""); setDesc(""); setLines([emptyLine(), emptyLine()]); setShowForm(false);
  };

  const autoRef = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("journal_entries").select("*", { count: "exact", head: true })
      .eq("user_business_id", businessId)
      .gte("entry_date", `${year}-01-01`).lte("entry_date", `${year}-12-31`);
    return `JE-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  };

  const save = async (post: boolean) => {
    if (!desc.trim()) { toast.error("Description is required"); return; }
    if (lines.some((l) => !l.account_id)) { toast.error("Every line needs an account"); return; }
    if (totalDebit === 0 && totalCredit === 0) { toast.error("Enter amounts on the lines"); return; }
    if (post && !balanced) { toast.error("Entry must balance before posting"); return; }
    for (const l of lines) {
      if (isAP(l.account_id) && !l.vendor_id) { toast.error("A/P lines need a vendor"); return; }
      if (isAR(l.account_id) && !l.customer_id) { toast.error("A/R lines need a customer"); return; }
    }

    const reference = ref.trim() || await autoRef();
    const { data: je, error } = await supabase
      .from("journal_entries")
      .insert({ user_id: userId, user_business_id: businessId, entry_date: date, reference, description: desc, is_posted: post })
      .select().single();
    if (error || !je) { toast.error(error?.message ?? "Failed"); return; }

    const payload = lines.map((l) => ({
      journal_entry_id: je.id, account_id: l.account_id,
      debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0,
      memo: l.memo || null, vendor_id: l.vendor_id || null, customer_id: l.customer_id || null,
      transaction_type: l.transaction_type || null, tax_amount: parseFloat(l.tax_amount) || 0,
    }));
    const { error: e2 } = await supabase.from("journal_lines").insert(payload);
    if (e2) { toast.error(e2.message); return; }
    toast.success(post ? "Journal entry posted" : "Saved as draft");
    reset(); onChange();
  };

  const postDraft = async (id: string) => {
    const { error } = await supabase.from("journal_entries").update({ is_posted: true }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Posted"); onChange(); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete this journal entry?")) return;
    await supabase.from("journal_lines").delete().eq("journal_entry_id", id);
    await supabase.from("journal_entries").delete().eq("id", id);
    toast.success("Deleted"); onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setShowGuide(true)}><BookOpen className="mr-2 h-4 w-4" />Chart of Accounts (COA)</Button>
        <Button variant="outline" onClick={() => setShowImport(true)}><Upload className="mr-2 h-4 w-4" />Bulk Import</Button>
        <Button onClick={() => setShowForm((v) => !v)}><Plus className="mr-2 h-4 w-4" />{showForm ? "Cancel" : "New Entry"}</Button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div>
              <Label>Reference # <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Auto-generated if left blank" />
              <p className="mt-1 text-xs text-muted-foreground">Leave blank to auto-generate (e.g., JE-{new Date().getFullYear()}-0001)</p>
            </div>
            <div><Label>Description *</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g., Cash sale to customer" /></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 min-w-[180px]">Account</th>
                  <th>Description</th><th>Contact</th><th>Txn Type</th>
                  <th>Tax</th><th>Debits</th><th>Credits</th><th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const ap = isAP(l.account_id); const ar = isAR(l.account_id);
                  return (
                    <tr key={i} className="border-b border-border/40 align-top">
                      <td className="py-2 pr-2">
                        <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                          value={l.account_id} onChange={(e) => updateLine(i, "account_id", e.target.value)}>
                          <option value="">Select account…</option>
                          {Object.entries(accountsByType).map(([t, list]) => (
                            <optgroup key={t} label={t}>
                              {list.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td className="pr-2"><Input value={l.memo} onChange={(e) => updateLine(i, "memo", e.target.value)} placeholder="Memo" /></td>
                      <td className="pr-2">
                        {ap ? (
                          <select className={`w-full rounded-md border bg-background px-2 py-1.5 text-sm ${!l.vendor_id ? "border-destructive" : "border-input"}`}
                            value={l.vendor_id} onChange={(e) => updateLine(i, "vendor_id", e.target.value)}>
                            <option value="">Select vendor…</option>
                            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        ) : ar ? (
                          <select className={`w-full rounded-md border bg-background px-2 py-1.5 text-sm ${!l.customer_id ? "border-destructive" : "border-input"}`}
                            value={l.customer_id} onChange={(e) => updateLine(i, "customer_id", e.target.value)}>
                            <option value="">Select customer…</option>
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="pr-2">
                        <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                          value={l.transaction_type} onChange={(e) => updateLine(i, "transaction_type", e.target.value)}>
                          <option value="">—</option><option value="Sales">Sales</option><option value="Purchases">Purchases</option>
                        </select>
                      </td>
                      <td className="pr-2"><Input type="number" min="0" value={l.tax_amount} onChange={(e) => updateLine(i, "tax_amount", e.target.value)} /></td>
                      <td className="pr-2"><Input type="number" min="0" value={l.debit} onChange={(e) => updateLine(i, "debit", e.target.value)} /></td>
                      <td className="pr-2"><Input type="number" min="0" value={l.credit} onChange={(e) => updateLine(i, "credit", e.target.value)} /></td>
                      <td>
                        <Button variant="ghost" size="icon" disabled={lines.length <= 2}
                          onClick={() => setLines((p) => p.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-3 text-sm">
            <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])}>
              <Plus className="mr-1 h-3 w-3" />Add Line
            </Button>
            <div className="flex items-center gap-4">
              <span>Totals: <b>{formatMoney(totalDebit)}</b> | <b>{formatMoney(totalCredit)}</b></span>
              {balanced ? (
                <span className="text-success font-medium">✓ Balanced</span>
              ) : totalDebit || totalCredit ? (
                <span className="text-destructive font-medium">⚠️ Out of balance: {formatMoney(Math.abs(totalDebit - totalCredit))}</span>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => save(false)}>Save as Draft</Button>
            <Button onClick={() => save(true)} disabled={!balanced}>Save & Post</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {entries.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">No journal entries yet.</div>
        )}
        {entries.map((e) => (
          <div key={e.id} className="rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{e.reference}</span>
                <span className="text-sm text-muted-foreground">| {e.description}</span>
                <span className="text-xs text-muted-foreground">{e.entry_date}</span>
              </div>
              <div className="flex items-center gap-2">
                {e.is_posted ? (
                  <Badge className="bg-success/15 text-success">Posted</Badge>
                ) : (
                  <>
                    <Badge variant="outline" className="border-amber-500 text-amber-600">Draft</Badge>
                    <Button size="sm" onClick={() => postDraft(e.id)}>Post</Button>
                  </>
                )}
                <Button size="icon" variant="ghost" onClick={() => del(e.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground">
                <th className="py-1 pl-4">Account</th><th>Memo</th>
                <th className="text-right">Debit</th><th className="pr-4 text-right">Credit</th>
              </tr></thead>
              <tbody>
                {e.journal_lines?.map((l) => (
                  <tr key={l.id} className="border-t border-border/30">
                    <td className="py-1 pl-4">
                      <span className="font-mono text-xs text-muted-foreground">{l.chart_of_accounts?.code}</span>{" "}
                      {l.chart_of_accounts?.name}
                    </td>
                    <td className="text-muted-foreground">{l.memo}</td>
                    <td className="text-right">{Number(l.debit) > 0 ? formatMoney(l.debit) : ""}</td>
                    <td className="pr-4 text-right">{Number(l.credit) > 0 ? formatMoney(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <BulkImportDialog
        open={showImport} onOpenChange={setShowImport}
        accounts={accounts} businessId={businessId} userId={userId} onDone={onChange}
      />
      <AccountGuideDialog open={showGuide} onOpenChange={setShowGuide} />
    </div>
  );
}

// --------------------- GENERAL LEDGER ---------------------
function GeneralLedger({ accounts, entries }: { accounts: Account[]; entries: JEntry[] }) {
  const [selId, setSelId] = useState<string>("");
  useEffect(() => { if (accounts[0] && !selId) setSelId(accounts[0].id); }, [accounts, selId]);

  const grouped = useMemo(() => {
    const g: Record<string, Account[]> = {};
    accounts.filter((a) => a.is_active).forEach((a) => {
      const t = labelFor(a);
      (g[t] ??= []).push(a);
    });
    return g;
  }, [accounts]);

  const ledger = useMemo(() => {
    const rows: { date: string; ref: string; desc: string; debit: number; credit: number; balance: number }[] = [];
    let bal = 0;
    entries.filter((e) => e.is_posted)
      .slice().sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      .forEach((e) => e.journal_lines?.forEach((l) => {
        if (l.account_id !== selId) return;
        const d = Number(l.debit) || 0, c = Number(l.credit) || 0;
        bal += d - c;
        rows.push({ date: e.entry_date, ref: e.reference ?? "", desc: e.description ?? "", debit: d, credit: c, balance: bal });
      }));
    return rows;
  }, [entries, selId]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="md:col-span-1 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card p-2">
        {Object.entries(grouped).length === 0 && <div className="p-4 text-sm text-muted-foreground">No accounts.</div>}
        {Object.entries(grouped).map(([t, list]) => (
          <div key={t} className="mb-3">
            <div className="px-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">{t}</div>
            {list.map((a) => (
              <button key={a.id} onClick={() => setSelId(a.id)}
                className={`block w-full rounded px-2 py-1 text-left text-sm ${selId === a.id ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted"}`}>
                <span className="font-mono text-xs">{a.code}</span> {a.name}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="md:col-span-3 rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pl-4">Date</th><th>Ref</th><th>Description</th>
            <th className="text-right">Debit</th><th className="text-right">Credit</th>
            <th className="pr-4 text-right">Balance</th>
          </tr></thead>
          <tbody>
            {ledger.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No posted transactions for this account.</td></tr>}
            {ledger.map((r, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="py-1.5 pl-4">{r.date}</td>
                <td className="font-mono text-xs">{r.ref}</td>
                <td>{r.desc}</td>
                <td className="text-right">{r.debit > 0 ? <span className="text-success">↗ {formatMoney(r.debit)}</span> : ""}</td>
                <td className="text-right">{r.credit > 0 ? <span className="text-destructive">↘ {formatMoney(r.credit)}</span> : ""}</td>
                <td className="pr-4 text-right font-medium">{formatMoney(r.balance)}</td>
              </tr>
            ))}
            {ledger.length > 0 && (
              <tr className="bg-muted/40 font-bold">
                <td className="py-2 pl-4" colSpan={3}>Ending Balance</td>
                <td className="text-right">{formatMoney(ledger.reduce((s, r) => s + r.debit, 0))}</td>
                <td className="text-right">{formatMoney(ledger.reduce((s, r) => s + r.credit, 0))}</td>
                <td className="pr-4 text-right">{formatMoney(ledger[ledger.length - 1]?.balance ?? 0)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --------------------- CHART OF ACCOUNTS ---------------------
function ChartOfAccountsTab({
  accounts, subcats, entries, businessId, userId, onChange,
}: {
  accounts: Account[]; subcats: Subcat[]; entries: JEntry[];
  businessId: string; userId: string; onChange: () => void;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newSubType, setNewSubType] = useState<AccountTypeLabel>("Asset");
  const [newSubName, setNewSubName] = useState("");
  const [addType, setAddType] = useState<AccountTypeLabel>("Asset");
  const [addSubcat, setAddSubcat] = useState("");
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");

  const balances = useMemo(() => {
    const m = new Map<string, number>();
    entries.filter((e) => e.is_posted).forEach((e) =>
      e.journal_lines?.forEach((l) => {
        m.set(l.account_id, (m.get(l.account_id) ?? 0) + (Number(l.debit) || 0) - (Number(l.credit) || 0));
      })
    );
    return m;
  }, [entries]);

  const initDefaults = async () => {
    if (!businessId) return;
    const subs = DEFAULT_SUBCATEGORIES.map((s) => ({ ...s, user_business_id: businessId, user_id: userId }));
    await supabase.from("account_subcategories").upsert(subs, { onConflict: "user_business_id,account_type,name" });
    const accs = DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({
      user_id: userId, user_business_id: businessId,
      code: a.code, name: a.name, type: TYPE_TO_ENUM[a.account_type] as any,
      account_type: a.account_type, subcategory: a.subcategory, is_active: true,
    }));
    const { error } = await supabase.from("chart_of_accounts").insert(accs);
    if (error) toast.error(error.message);
    else { toast.success(`Created ${accs.length} accounts and ${subs.length} subcategories`); onChange(); }
  };

  const addSubcategory = async () => {
    if (!newSubName.trim()) return;
    const { error } = await supabase.from("account_subcategories").insert({
      user_business_id: businessId, user_id: userId, account_type: newSubType,
      name: newSubName.trim(), is_system: false, display_order: 99,
    });
    if (error) toast.error(error.message); else { setNewSubName(""); onChange(); }
  };
  const delSubcategory = async (id: string) => {
    await supabase.from("account_subcategories").delete().eq("id", id); onChange();
  };

  const addAccount = async () => {
    if (!addName.trim() || addCode.length !== 3) {
      toast.error("Provide a name and a 3-digit code"); return;
    }
    const full = ACCOUNT_TYPE_PREFIXES[addType] + addCode;
    const { error } = await supabase.from("chart_of_accounts").insert({
      user_id: userId, user_business_id: businessId, code: full, name: addName.trim(),
      type: TYPE_TO_ENUM[addType] as any, account_type: addType, subcategory: addSubcat || null, is_active: true,
    });
    if (error) toast.error(error.message);
    else { toast.success("Account added"); setAddName(""); setAddCode(""); setAddSubcat(""); onChange(); }
  };

  const delAccount = async (a: Account) => {
    if (!confirm(`Delete account ${a.code} - ${a.name}?`)) return;
    const { error } = await supabase.from("chart_of_accounts").delete().eq("id", a.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setShowGuide(true)}><BookOpen className="mr-2 h-4 w-4" />COA Guide</Button>
        {accounts.length === 0 && <Button onClick={initDefaults}>Initialize Defaults</Button>}
        <Button variant="outline" onClick={() => setShowSub((v) => !v)}>Manage Subcategories</Button>
        <Button onClick={() => setShowAdd((v) => !v)}><Plus className="mr-2 h-4 w-4" />Add Account</Button>
      </div>

      {showSub && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-2 md:grid-cols-[200px_1fr_auto] items-end">
            <div>
              <Label>Type</Label>
              <Select value={newSubType} onValueChange={(v) => setNewSubType(v as AccountTypeLabel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_GROUPS.map((g) => <SelectItem key={g.type} value={g.type}>{g.type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Name</Label><Input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="e.g., Crypto Wallet" /></div>
            <Button onClick={addSubcategory}>Add Subcategory</Button>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {ACCOUNT_TYPE_GROUPS.map((g) => (
              <div key={g.type}>
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{g.type}</div>
                <div className="space-y-1">
                  {subcats.filter((s) => s.account_type === g.type).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded border border-border/60 px-2 py-1 text-sm">
                      <span>{s.name}</span>
                      {!s.is_system && (
                        <Button size="icon" variant="ghost" onClick={() => delSubcategory(s.id)}><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-5 items-end">
            <div>
              <Label>Type *</Label>
              <Select value={addType} onValueChange={(v) => { setAddType(v as AccountTypeLabel); setAddSubcat(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_GROUPS.map((g) => <SelectItem key={g.type} value={g.type}>{g.type} ({g.range.slice(0,1)}XXX)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subcategory</Label>
              <Select value={addSubcat} onValueChange={setAddSubcat}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {subcats.filter((s) => s.account_type === addType).map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Name *</Label><Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g., Cash" /></div>
            <div>
              <Label>Code *</Label>
              <div className="flex items-center gap-1">
                <span className="rounded border border-input bg-muted px-2 py-1.5 text-sm font-mono">{ACCOUNT_TYPE_PREFIXES[addType]}</span>
                <Input maxLength={3} value={addCode} onChange={(e) => setAddCode(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="000" />
              </div>
            </div>
            <Button onClick={addAccount}>Add</Button>
          </div>
          {(addSubcat === "Bank Account" || addSubcat === "Digital Wallet" || addSubcat === "Cash") && (
            <p className="mt-2 text-xs text-amber-600">Tip: bank/wallet/cash accounts are best created from <Link to="/bank-accounts" className="underline">Bank Accounts</Link> — they auto-create the COA entry.</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {accounts.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            No accounts yet — click "Initialize Defaults" above to seed the standard chart of accounts.
          </div>
        )}
        {ACCOUNT_TYPE_GROUPS.map((g) => {
          const list = accounts.filter((a) => labelFor(a) === g.type)
            .sort((a, b) => a.code.localeCompare(b.code));
          if (!list.length) return null;
          const total = list.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
          return (
            <div key={g.type} className="rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border/60 p-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${TYPE_COLOR[g.type]}`}>{g.type}</span>
                  <span className="text-xs text-muted-foreground">{g.range}</span>
                </div>
                <span className="text-sm font-medium">{formatMoney(total)}</span>
              </div>
              <div>
                {list.map((a) => {
                  const bal = balances.get(a.id) ?? 0;
                  const credit = isCreditNormal(g.type);
                  return (
                    <div key={a.id} className="flex items-center justify-between border-b border-border/30 px-4 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground w-12">{a.code}</span>
                        <span>{a.name}</span>
                        {a.subcategory && <Badge variant="outline" className="text-xs">{a.subcategory}</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{formatMoney(Math.abs(bal))} {credit && bal !== 0 ? <span className="text-xs text-muted-foreground">CR</span> : null}</span>
                        <Button size="icon" variant="ghost" onClick={() => delAccount(a)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AccountGuideDialog open={showGuide} onOpenChange={setShowGuide} />
    </div>
  );
}

// --------------------- BULK IMPORT DIALOG ---------------------
function BulkImportDialog({
  open, onOpenChange, accounts, businessId, userId, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  accounts: Account[]; businessId: string; userId: string; onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: string[] } | null>(null);

  const findAccount = (name: string) => {
    const n = name.trim().toLowerCase();
    return accounts.find((a) => a.name.toLowerCase() === n || a.code === n.trim());
  };

  const run = async () => {
    setBusy(true); setResult(null);
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    let ok = 0; const failed: string[] = [];
    for (const ln of lines) {
      const cols = ln.split(/\t|,/).map((c) => c.trim());
      if (cols.length < 7) { failed.push(`Skip: ${ln}`); continue; }
      const [refNum, , dateStr, debAcc, debAmt, credAcc, credAmt] = cols;
      const dr = findAccount(debAcc); const cr = findAccount(credAcc);
      if (!dr || !cr) { failed.push(`Unknown account: ${ln}`); continue; }
      const parsedDate = new Date(dateStr);
      const dateISO = isNaN(+parsedDate) ? new Date().toISOString().slice(0,10) : parsedDate.toISOString().slice(0,10);
      const { data: je, error } = await supabase.from("journal_entries").insert({
        user_id: userId, user_business_id: businessId, entry_date: dateISO,
        reference: refNum, description: `Bulk import ${refNum}`, is_posted: true,
      }).select().single();
      if (error || !je) { failed.push(`Insert failed: ${ln} — ${error?.message}`); continue; }
      const { error: e2 } = await supabase.from("journal_lines").insert([
        { journal_entry_id: je.id, account_id: dr.id, debit: parseFloat(debAmt) || 0, credit: 0 },
        { journal_entry_id: je.id, account_id: cr.id, debit: 0, credit: parseFloat(credAmt) || 0 },
      ]);
      if (e2) { failed.push(`Lines failed: ${ln}`); continue; }
      ok++;
    }
    setBusy(false); setResult({ ok, failed });
    if (ok) { toast.success(`Imported ${ok} entries`); onDone(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Journal Entries</DialogTitle>
          <DialogDescription>
            Tab- or comma-separated. Columns: <code>Entry | Day | Date | Debit Account | Debit | Credit Account | Credit</code>.
            Account names must match the Chart of Accounts.
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={"4001\t1\tMar 1\tCash\t100000\tOwner's Equities\t100000"} />
        {result && (
          <div className="text-sm">
            <p className="text-success">✓ {result.ok} imported.</p>
            {result.failed.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-destructive">{result.failed.length} failed</summary>
                <ul className="mt-1 max-h-40 overflow-y-auto text-xs text-muted-foreground">
                  {result.failed.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={run} disabled={busy || !text.trim()}>{busy ? "Importing…" : "Import"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --------------------- ACCOUNT GUIDE DIALOG ---------------------
function AccountGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chart of Accounts Guide</DialogTitle>
          <DialogDescription>Standard account ranges and what they're used for.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {ACCOUNT_TYPE_GROUPS.map((g) => (
            <div key={g.type} className="flex items-start gap-3">
              <span className={`mt-0.5 rounded px-2 py-0.5 text-xs font-semibold ${TYPE_COLOR[g.type]}`}>{g.type}</span>
              <div>
                <div className="font-medium">Range {g.range}</div>
                <div className="text-xs text-muted-foreground">
                  {g.type === "Asset" && "What you own — cash, receivables, inventory, equipment."}
                  {g.type === "Liability" && "What you owe — payables, accrued expenses, loans."}
                  {g.type === "Equity" && "Owner's stake — capital, retained earnings."}
                  {g.type === "Revenue" && "Income from operations — sales, services, fees."}
                  {g.type === "COGS" && "Direct costs of goods or services sold."}
                  {g.type === "Expense" && "Operating expenses — rent, salaries, utilities."}
                  {g.type === "Other Income" && "Non-operating income — gains on asset sales."}
                  {g.type === "Other Expense" && "Non-operating expenses — losses, write-offs."}
                </div>
              </div>
            </div>
          ))}
          <div className="mt-4 rounded border border-border p-3 text-xs text-muted-foreground">
            <b className="text-foreground">Normal balances:</b> Asset & Expense accounts increase on the <b>debit</b> side.
            Liability, Equity & Revenue accounts increase on the <b>credit</b> side.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
