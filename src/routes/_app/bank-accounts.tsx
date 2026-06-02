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
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/bank-accounts")({ component: BankAccounts });

type Business = { id: string; name: string };

function BankAccounts() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", bank_name: "", account_number: "", type: "checking", balance: "0" });

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

  const load = async () => {
    if (!selectedBusinessId) { setRows([]); return; }
    const { data } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_business_id", selectedBusinessId)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [selectedBusinessId]);

  const save = async () => {
    if (!selectedBusinessId) return toast.error("Select a business first");
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("bank_accounts").insert({
      ...form,
      user_id: user!.id,
      user_business_id: selectedBusinessId,
      balance: Number(form.balance) || 0,
      type: form.type as any,
    });
    if (error) return toast.error(error.message);
    toast.success("Account added");
    setOpen(false);
    setForm({ name: "", bank_name: "", account_number: "", type: "checking", balance: "0" });
    load();
  };

  const currentBusiness = businesses.find((b) => b.id === selectedBusinessId);

  return (
    <div>
      <PageHeader
        title="Bank Accounts"
        subtitle={currentBusiness ? `Accounts for ${currentBusiness.name}` : "Manage your business accounts."}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedBusinessId} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Add account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New bank account</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Linked to business: <b className="text-foreground">{currentBusiness?.name}</b>
                </div>
                <div><Label>Nickname</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Business" /></div>
                <div><Label>Bank / Institution</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="KCB / Equity / M-Pesa" /></div>
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

          {rows.length === 0 ? (
            <Empty msg={`No bank accounts for ${currentBusiness?.name ?? "this business"} yet`} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-xs uppercase text-muted-foreground">{r.type.replace("_", " ")}</div>
                  <div className="mt-1 font-display text-lg font-semibold">{r.name}</div>
                  <div className="text-sm text-muted-foreground">{r.bank_name}</div>
                  <div className="mt-3 font-display text-2xl font-bold text-primary">{formatMoney(r.balance, r.currency)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">{msg}</div>;
}
