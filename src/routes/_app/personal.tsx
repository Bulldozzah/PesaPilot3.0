import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, StatCard } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/personal")({ component: Personal });

function Personal() {
  const { user } = useAuth();
  const money = useMoney();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: "expense", amount: "", category: "Food", description: "", transaction_date: new Date().toISOString().slice(0,10) });

  const load = async () => { const { data } = await supabase.from("personal_transactions").select("*").order("transaction_date", { ascending: false }); setRows(data ?? []); };
  useEffect(() => { load(); }, [user]);

  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
  const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);

  const save = async () => {
    if (!f.amount || Number(f.amount) <= 0) return toast.error("Enter an amount");
    const { error } = await supabase.from("personal_transactions").insert({ ...f, user_id: user!.id, amount: Number(f.amount), type: f.type as any });
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); load();
  };

  return (
    <div>
      <PageHeader title="Personal Finance" subtitle="Track household income and expenses separately from business." action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Add transaction</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New transaction</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Type</Label>
                <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Amount</Label><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
              <div><Label>Category</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={f.transaction_date} onChange={(e) => setF({ ...f, transaction_date: e.target.value })} /></div>
              <Button onClick={save} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Income" value={money(income)} accent="success" />
        <StatCard label="Expenses" value={money(expense)} accent="destructive" />
        <StatCard label="Net" value={money(income - expense)} accent={income - expense >= 0 ? "success" : "destructive"} />
      </div>
      <div className="mt-6 rounded-2xl border border-border bg-card divide-y">
        {rows.length === 0 && <div className="p-10 text-center text-muted-foreground">No transactions yet</div>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-4">
            <div><div className="font-medium">{r.description || r.category}</div><div className="text-xs text-muted-foreground">{r.category} · {r.transaction_date}</div></div>
            <div className={`font-display text-lg font-semibold ${r.type === "income" ? "text-success" : "text-destructive"}`}>{r.type === "income" ? "+" : "−"} {money(r.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
