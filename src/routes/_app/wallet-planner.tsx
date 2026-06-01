import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/wallet-planner")({ component: Planner });

function Planner() {
  const { user } = useAuth();
  const month = new Date().toISOString().slice(0,7) + "-01";
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState({ category: "", amount_planned: "" });
  const load = async () => { const { data } = await supabase.from("wallet_budgets").select("*").eq("month", month); setRows(data ?? []); };
  useEffect(() => { load(); }, [user]);
  const save = async () => {
    if (!f.category || !f.amount_planned) return toast.error("Fill all fields");
    const { error } = await supabase.from("wallet_budgets").upsert({ user_id: user!.id, category: f.category, amount_planned: Number(f.amount_planned), month }, { onConflict: "user_id,category,month" });
    if (error) return toast.error(error.message);
    setF({ category: "", amount_planned: "" }); load();
  };
  const total = rows.reduce((s, r) => s + Number(r.amount_planned), 0);
  return (
    <div>
      <PageHeader title="Wallet Planner" subtitle={`Budget for ${new Date(month).toLocaleString("en", { month: "long", year: "numeric" })}`} />
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-2 md:grid-cols-[1fr_200px_auto]">
          <div><Label>Category</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Groceries" /></div>
          <div><Label>Planned amount</Label><Input type="number" value={f.amount_planned} onChange={(e) => setF({ ...f, amount_planned: e.target.value })} /></div>
          <div className="flex items-end"><Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90">Add / Update</Button></div>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-border bg-card divide-y">
        {rows.length === 0 && <div className="p-10 text-center text-muted-foreground">No budget yet</div>}
        {rows.map((r) => <div key={r.id} className="flex items-center justify-between p-4"><span className="font-medium">{r.category}</span><span className="font-display text-lg">{formatMoney(r.amount_planned)}</span></div>)}
        {rows.length > 0 && <div className="flex items-center justify-between bg-muted/40 p-4 font-bold"><span>Total planned</span><span className="font-display">{formatMoney(total)}</span></div>}
      </div>
    </div>
  );
}
