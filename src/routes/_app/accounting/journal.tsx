import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/accounting/journal")({ component: Journal });

type Account = { id: string; code: string; name: string; type: string };

const DEFAULT_COA: Omit<Account, "id">[] = [
  { code: "1000", name: "Cash", type: "asset" },
  { code: "1010", name: "Bank Account", type: "asset" },
  { code: "1200", name: "Accounts Receivable", type: "asset" },
  { code: "1500", name: "Inventory", type: "asset" },
  { code: "1800", name: "Equipment", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2500", name: "Loans Payable", type: "liability" },
  { code: "3000", name: "Owner's Equity", type: "equity" },
  { code: "4000", name: "Sales Revenue", type: "income" },
  { code: "5000", name: "Cost of Goods Sold", type: "expense" },
  { code: "5100", name: "Rent Expense", type: "expense" },
  { code: "5200", name: "Salaries Expense", type: "expense" },
  { code: "5300", name: "Utilities Expense", type: "expense" },
  { code: "5400", name: "Marketing Expense", type: "expense" },
  { code: "5900", name: "Other Expenses", type: "expense" },
];

function Journal() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: a } = await supabase.from("chart_of_accounts").select("*").order("code");
    if (!a || a.length === 0) {
      const rows = DEFAULT_COA.map((r) => ({ ...r, user_id: user.id, is_personal: false }));
      await supabase.from("chart_of_accounts").insert(rows as any);
      const { data: a2 } = await supabase.from("chart_of_accounts").select("*").order("code");
      setAccounts((a2 as Account[]) ?? []);
    } else setAccounts(a as Account[]);

    const { data: e } = await supabase.from("journal_entries").select("*, journal_lines(*, chart_of_accounts(code,name))").order("entry_date", { ascending: false }).limit(50);
    setEntries(e ?? []);
  };
  useEffect(() => { load(); }, [user]);

  return (
    <div>
      <PageHeader title="Journal Entries" subtitle="Double-entry bookkeeping — every entry must balance." action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-primary text-primary-foreground hover:bg-primary/90">New entry</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New journal entry</DialogTitle></DialogHeader>
            <EntryForm accounts={accounts} onDone={() => { setOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      } />

      <div className="rounded-2xl border border-border bg-card p-1">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No entries yet. Create your first one above.</TableCell></TableRow>}
            {entries.map((e) => (
              <>
                <TableRow key={e.id} className="bg-muted/40">
                  <TableCell className="font-medium">{e.entry_date}</TableCell>
                  <TableCell>{e.reference}</TableCell>
                  <TableCell colSpan={3} className="text-muted-foreground">{e.description}</TableCell>
                </TableRow>
                {e.journal_lines?.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.chart_of_accounts?.code}</TableCell>
                    <TableCell>{l.chart_of_accounts?.name}</TableCell>
                    <TableCell className="text-right">{Number(l.debit) > 0 ? formatMoney(l.debit) : ""}</TableCell>
                    <TableCell className="text-right">{Number(l.credit) > 0 ? formatMoney(l.credit) : ""}</TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EntryForm({ accounts, onDone }: { accounts: Account[]; onDone: () => void }) {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState("");
  const [desc, setDesc] = useState("");
  const [lines, setLines] = useState([
    { account_id: "", debit: "", credit: "" },
    { account_id: "", debit: "", credit: "" },
  ]);
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = totalDebit > 0 && totalDebit === totalCredit;

  const save = async () => {
    if (!balanced) { toast.error("Entry must balance: total debits = total credits"); return; }
    if (lines.some((l) => !l.account_id)) { toast.error("Select an account on every line"); return; }
    const { data: je, error } = await supabase.from("journal_entries").insert({
      user_id: user!.id, entry_date: date, reference: ref, description: desc,
    }).select().single();
    if (error || !je) { toast.error(error?.message ?? "Failed"); return; }
    const payload = lines.map((l) => ({
      journal_entry_id: je.id, account_id: l.account_id,
      debit: Number(l.debit) || 0, credit: Number(l.credit) || 0,
    }));
    const { error: e2 } = await supabase.from("journal_lines").insert(payload);
    if (e2) { toast.error(e2.message); return; }
    toast.success("Journal entry saved");
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><Label>Reference</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="INV-001" /></div>
        <div><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Sale to customer" /></div>
      </div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <Select value={l.account_id} onValueChange={(v) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, account_id: v } : x))}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input className="col-span-3" type="number" placeholder="Debit" value={l.debit} onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, debit: e.target.value, credit: e.target.value ? "" : x.credit } : x))} />
            <Input className="col-span-3" type="number" placeholder="Credit" value={l.credit} onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, credit: e.target.value, debit: e.target.value ? "" : x.debit } : x))} />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setLines((l) => [...l, { account_id: "", debit: "", credit: "" }])}>+ Add line</Button>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-2 text-sm">
        <span>Totals</span>
        <span>Debit: <b>{formatMoney(totalDebit)}</b> · Credit: <b>{formatMoney(totalCredit)}</b> {balanced ? <span className="text-success">✓ balanced</span> : <span className="text-destructive">✗ unbalanced</span>}</span>
      </div>
      <Button onClick={save} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Save entry</Button>
    </div>
  );
}
