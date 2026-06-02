import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Building2, Wallet, Banknote, Calendar as CalendarIcon, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/bank-accounts")({ component: BankAccounts });

type Business = { id: string; name: string };

type AccountType = "checking" | "mobile_money" | "cash";
const TYPE_LABEL: Record<AccountType, string> = {
  checking: "Bank Account",
  mobile_money: "Digital Wallet",
  cash: "Cash",
};

const CURRENCIES = ["USD", "EUR", "GBP", "ZAR", "NGN", "KES", "GHS"];

type BankAccount = {
  id: string;
  name: string;
  account_number: string | null;
  bank_name: string | null;
  type: AccountType;
  currency: string;
  notes: string | null;
  account_code: string | null;
  chart_account_id: string | null;
  current_balance: number;
  balance: number;
  is_active: boolean;
  user_business_id: string | null;
};

type ChartAccount = {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  is_active: boolean;
};

type TxType = "in" | "out" | "transfer";

const emptyAccountForm = {
  name: "",
  type: "checking" as AccountType,
  bank_name: "",
  account_number: "",
  currency: "KES",
  notes: "",
};

const emptyTxForm = {
  type: "in" as TxType,
  amount: "",
  offset_account_id: "",
  date: new Date().toISOString().slice(0, 10),
  reference: "",
  memo: "",
};

function BankAccounts() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [chart, setChart] = useState<ChartAccount[]>([]);

  // Account modal
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);

  // Transaction modal
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txAccount, setTxAccount] = useState<BankAccount | null>(null);
  const [txForm, setTxForm] = useState(emptyTxForm);
  const [accountSearchQuery, setAccountSearchQuery] = useState("");

  // Load businesses
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_businesses")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data as Business[]) ?? [];
      setBusinesses(list);
      if (list.length && !selectedBusinessId) setSelectedBusinessId(list[0].id);
    })();
  }, [user]);

  const loadAccounts = async () => {
    if (!selectedBusinessId) return setAccounts([]);
    const { data } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_business_id", selectedBusinessId)
      .order("created_at", { ascending: false });
    setAccounts((data as BankAccount[]) ?? []);
  };

  const loadChart = async () => {
    if (!selectedBusinessId) return setChart([]);
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name, type, is_active")
      .eq("user_business_id", selectedBusinessId)
      .order("code");
    setChart((data as ChartAccount[]) ?? []);
  };

  useEffect(() => {
    loadAccounts();
    loadChart();
  }, [selectedBusinessId]);

  const currentBusiness = businesses.find((b) => b.id === selectedBusinessId);

  // ---------- Account CRUD ----------
  const openCreate = () => {
    setEditingAccount(null);
    setAccountForm({ ...emptyAccountForm, currency: accounts[0]?.currency ?? "KES" });
    setAccountModalOpen(true);
  };

  const openEdit = (a: BankAccount) => {
    setEditingAccount(a);
    setAccountForm({
      name: a.name,
      type: a.type,
      bank_name: a.bank_name ?? "",
      account_number: a.account_number ?? "",
      currency: a.currency ?? "KES",
      notes: a.notes ?? "",
    });
    setAccountModalOpen(true);
  };

  const saveAccount = async () => {
    if (!selectedBusinessId) return toast.error("Select a business first");
    if (!accountForm.name.trim()) return toast.error("Account name required");
    if (accountForm.type !== "cash" && !accountForm.bank_name.trim())
      return toast.error("Institution name required");

    const payload = {
      name: accountForm.name.trim(),
      type: accountForm.type,
      bank_name: accountForm.type !== "cash" ? accountForm.bank_name.trim() : null,
      account_number: accountForm.account_number.trim() || null,
      currency: accountForm.currency,
      notes: accountForm.notes.trim() || null,
    };

    if (editingAccount) {
      const { error } = await supabase.from("bank_accounts").update(payload).eq("id", editingAccount.id);
      if (error) return toast.error(error.message);
      toast.success("Account updated");
    } else {
      const { error } = await supabase.from("bank_accounts").insert({
        ...payload,
        user_id: user!.id,
        user_business_id: selectedBusinessId,
      });
      if (error) return toast.error(error.message);
      toast.success("Account created");
    }
    setAccountModalOpen(false);
    loadAccounts();
    loadChart();
  };

  const deleteAccount = async (a: BankAccount) => {
    if (!confirm(`Delete "${a.name}"? The linked Chart of Accounts entry will be deactivated to preserve history.`))
      return;
    const { error } = await supabase.from("bank_accounts").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Account deleted");
    loadAccounts();
    loadChart();
  };

  const toggleActive = async (a: BankAccount) => {
    const { error } = await supabase.from("bank_accounts").update({ is_active: !a.is_active }).eq("id", a.id);
    if (error) return toast.error(error.message);
    loadAccounts();
    loadChart();
  };

  // ---------- Transaction ----------
  const openTx = (a: BankAccount) => {
    setTxAccount(a);
    setTxForm({ ...emptyTxForm, date: new Date().toISOString().slice(0, 10) });
    setAccountSearchQuery("");
    setTxModalOpen(true);
  };

  const handleTxTypeChange = (type: TxType) => {
    setTxForm({ ...txForm, type, offset_account_id: "" });
    setAccountSearchQuery("");
  };

  const filteredOffsetOptions = useMemo(() => {
    if (!txAccount) return [];
    const bankChartIds = new Set(
      accounts.filter((x) => x.id !== txAccount.id && x.chart_account_id).map((x) => x.chart_account_id as string)
    );
    let list: ChartAccount[] = [];
    if (txForm.type === "in") {
      list = chart.filter((c) => ["income", "equity", "liability", "asset"].includes(c.type) && c.id !== txAccount.chart_account_id);
    } else if (txForm.type === "out") {
      list = chart.filter((c) => ["expense", "asset", "liability"].includes(c.type) && c.id !== txAccount.chart_account_id);
    } else {
      list = chart.filter((c) => bankChartIds.has(c.id));
    }
    const q = accountSearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
    );
  }, [txForm.type, chart, accounts, txAccount, accountSearchQuery]);

  const txValid = () => {
    const amt = parseFloat(txForm.amount) || 0;
    return !!(
      txAccount?.chart_account_id &&
      txForm.offset_account_id &&
      amt > 0 &&
      txForm.memo.trim().length >= 3 &&
      txForm.date
    );
  };

  const saveTx = async () => {
    if (!txValid() || !txAccount) return;
    const amount = parseFloat(txForm.amount);
    const year = new Date(txForm.date).getFullYear();
    const prefix = txForm.type === "transfer" ? "TRF" : "TXN";
    let reference = txForm.reference.trim();
    if (!reference) {
      const { count } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_business_id", selectedBusinessId);
      reference = `${prefix}-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
    }

    const { data: je, error: jeErr } = await supabase
      .from("journal_entries")
      .insert({
        user_id: user!.id,
        user_business_id: selectedBusinessId,
        entry_date: txForm.date,
        reference,
        description: txForm.memo.trim(),
      })
      .select("id")
      .single();
    if (jeErr || !je) return toast.error(jeErr?.message ?? "Failed");

    // Determine debit/credit
    let debitAccountId: string;
    let creditAccountId: string;
    if (txForm.type === "in") {
      debitAccountId = txAccount.chart_account_id!;
      creditAccountId = txForm.offset_account_id;
    } else if (txForm.type === "out") {
      debitAccountId = txForm.offset_account_id;
      creditAccountId = txAccount.chart_account_id!;
    } else {
      debitAccountId = txForm.offset_account_id; // destination bank
      creditAccountId = txAccount.chart_account_id!;
    }

    const { error: linesErr } = await supabase.from("journal_lines").insert([
      { journal_entry_id: je.id, account_id: debitAccountId, debit: amount, credit: 0, description: txForm.memo.trim() },
      { journal_entry_id: je.id, account_id: creditAccountId, debit: 0, credit: amount, description: txForm.memo.trim() },
    ]);
    if (linesErr) return toast.error(linesErr.message);

    toast.success(`Transaction recorded (${reference})`);
    setTxModalOpen(false);
    loadAccounts();
  };

  const previewDebitName = () => {
    if (!txAccount) return "";
    if (txForm.type === "in") return `${txAccount.name}${txAccount.bank_name ? ` (${txAccount.bank_name})` : ""}`;
    const c = chart.find((x) => x.id === txForm.offset_account_id);
    return c ? `${c.code} ${c.name}` : "—";
  };
  const previewCreditName = () => {
    if (!txAccount) return "";
    if (txForm.type === "in") {
      const c = chart.find((x) => x.id === txForm.offset_account_id);
      return c ? `${c.code} ${c.name}` : "—";
    }
    return `${txAccount.name}${txAccount.bank_name ? ` (${txAccount.bank_name})` : ""}`;
  };

  const iconFor = (t: AccountType) =>
    t === "checking" ? <Building2 className="h-5 w-5" /> : t === "mobile_money" ? <Wallet className="h-5 w-5" /> : <Banknote className="h-5 w-5" />;
  const colorFor = (t: AccountType) =>
    t === "checking" ? "bg-blue-500/10 text-blue-600" : t === "mobile_money" ? "bg-purple-500/10 text-purple-600" : "bg-green-500/10 text-green-600";

  return (
    <div>
      <PageHeader
        title="Bank Accounts"
        subtitle={currentBusiness ? `Accounts for ${currentBusiness.name}` : "Manage your business accounts."}
        action={
          <Button disabled={!selectedBusinessId} onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-1 h-4 w-4" /> Add account
          </Button>
        }
      />

      {businesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <div className="font-display text-lg font-semibold">No business yet</div>
          <p className="mt-1 text-sm text-muted-foreground">Bank accounts are scoped to a business. Start one to add accounts.</p>
          <Link to="/businesses" className="mt-4 inline-block">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Browse businesses</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <div className="mb-2 text-sm font-medium text-foreground">Select business</div>
            <div className="flex flex-wrap gap-2">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBusinessId(b.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    selectedBusinessId === b.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
              No bank accounts for {currentBusiness?.name} yet
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((a) => (
                <div key={a.id} className={`rounded-2xl border border-border bg-card p-5 ${a.is_active ? "" : "opacity-60"}`}>
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorFor(a.type)}`}>{iconFor(a.type)}</div>
                    <div className="flex items-center gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.is_active ? "bg-green-500/15 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {a.is_active ? "Active" : "Inactive"}
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteAccount(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{a.account_code ?? "—"}</span>
                    <span>· Asset</span>
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold">{a.name}</div>
                  <div className="text-sm text-muted-foreground">{TYPE_LABEL[a.type] ?? a.type}</div>
                  {a.bank_name && <div className="mt-1 text-xs text-muted-foreground">Institution: <b className="text-foreground">{a.bank_name}</b></div>}
                  {a.account_number && (
                    <div className="text-xs text-muted-foreground">Account #: <b className="text-foreground">****{a.account_number.slice(-4)}</b></div>
                  )}
                  <div className={`mt-3 font-display text-2xl font-bold ${Number(a.current_balance) >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatMoney(Number(a.current_balance), a.currency)}
                  </div>
                  {a.is_active && (
                    <Button onClick={() => openTx(a)} className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-1 h-4 w-4" /> Add Transaction
                    </Button>
                  )}
                  <button
                    onClick={() => toggleActive(a)}
                    className={`mt-2 w-full text-xs font-medium ${a.is_active ? "text-orange-600" : "text-green-600"}`}
                  >
                    {a.is_active ? "Deactivate Account" : "Activate Account"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Account Modal */}
      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAccount ? "Edit account" : "New bank account"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Linked to business: <b className="text-foreground">{currentBusiness?.name}</b>
            </div>
            <div>
              <Label>Account Type *</Label>
              <Select value={accountForm.type} onValueChange={(v) => setAccountForm({ ...accountForm, type: v as AccountType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Bank Account</SelectItem>
                  <SelectItem value="mobile_money">Digital Wallet</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account Name *</Label>
              <Input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Main Checking" />
            </div>
            {accountForm.type !== "cash" && (
              <div>
                <Label>Institution Name *</Label>
                <Input value={accountForm.bank_name} onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })} placeholder="Chase / M-Pesa / PayPal" />
              </div>
            )}
            {accountForm.type !== "cash" && (
              <div>
                <Label>Account Number</Label>
                <Input value={accountForm.account_number} onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })} placeholder="optional" />
              </div>
            )}
            <div>
              <Label>Currency *</Label>
              <Select value={accountForm.currency} onValueChange={(v) => setAccountForm({ ...accountForm, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={accountForm.notes} onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} rows={2} />
            </div>
            <Button onClick={saveAccount} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {editingAccount ? "Save changes" : "Create account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog open={txModalOpen} onOpenChange={setTxModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New transaction · {txAccount?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: "in", label: "Money In", icon: <ArrowDownLeft className="h-4 w-4" /> },
                { v: "out", label: "Money Out", icon: <ArrowUpRight className="h-4 w-4" /> },
                { v: "transfer", label: "Transfer", icon: <ArrowLeftRight className="h-4 w-4" /> },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setTxForm({ ...txForm, type: opt.v, offset_account_id: "" })}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-all ${
                    txForm.type === opt.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" min="0" step="0.01" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
              {txForm.type !== "in" && txAccount && parseFloat(txForm.amount) > Number(txAccount.current_balance) && (
                <p className="mt-1 text-xs text-amber-600">⚠ Amount exceeds available balance ({formatMoney(Number(txAccount.current_balance), txAccount.currency)})</p>
              )}
            </div>
            <div>
              <Label>{txForm.type === "transfer" ? "Destination Account *" : "Counter Account *"}</Label>
              <Select value={txForm.offset_account_id} onValueChange={(v) => setTxForm({ ...txForm, offset_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {offsetOptions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No eligible accounts</div>
                  ) : offsetOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-mono text-xs">{c.code}</span> · {c.name} <span className="text-xs text-muted-foreground">({c.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Reference #</Label>
                <Input value={txForm.reference} onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })} placeholder="Auto-generated" />
              </div>
            </div>
            <div>
              <Label>Description * (min 3 chars)</Label>
              <Textarea value={txForm.memo} onChange={(e) => setTxForm({ ...txForm, memo: e.target.value })} rows={2} />
            </div>

            {/* Preview */}
            {txValid() && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
                <div className="mb-1 font-semibold text-foreground">Journal Entry Preview</div>
                <div className="font-mono">
                  <div>Debit:&nbsp;&nbsp;{previewDebitName()} &nbsp;&nbsp; {formatMoney(parseFloat(txForm.amount), txAccount?.currency)}</div>
                  <div>Credit: {previewCreditName()} &nbsp;&nbsp; {formatMoney(parseFloat(txForm.amount), txAccount?.currency)}</div>
                </div>
              </div>
            )}

            {!txValid() && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
                Required: amount &gt; 0, counter account, date, description (3+ chars).
              </div>
            )}

            <Button disabled={!txValid()} onClick={saveTx} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Record Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
