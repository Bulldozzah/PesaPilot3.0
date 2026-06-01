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
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/bank-accounts")({ component: BankAccounts });

function BankAccounts() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", bank_name: "", account_number: "", type: "checking", balance: "0" });

  const load = async () => {
    const { data } = await supabase.from("bank_accounts").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("bank_accounts").insert({ ...form, user_id: user!.id, balance: Number(form.balance) || 0, type: form.type as any });
    if (error) return toast.error(error.message);
    toast.success("Account added"); setOpen(false); setForm({ name: "", bank_name: "", account_number: "", type: "checking", balance: "0" }); load();
  };

  return (
    <div>
      <PageHeader title="Bank Accounts" subtitle="Manage your business and personal accounts." action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Add account</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New bank account</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nickname</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Business" /></div>
              <div><Label>Bank</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="KCB / Equity / M-Pesa" /></div>
              <div><Label>Account #</Label><Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Opening balance</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
              <Button onClick={save} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />
      {rows.length === 0 ? <Empty msg="No bank accounts yet" /> : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="text-xs uppercase text-muted-foreground">{r.type.replace("_"," ")}</div>
              <div className="mt-1 font-display text-lg font-semibold">{r.name}</div>
              <div className="text-sm text-muted-foreground">{r.bank_name}</div>
              <div className="mt-3 font-display text-2xl font-bold text-primary">{formatMoney(r.balance, r.currency)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Empty({ msg }: { msg: string }) { return <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">{msg}</div>; }
