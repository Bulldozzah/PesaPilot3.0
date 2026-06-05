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
import { Progress } from "@/components/ui/progress";
import { useMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/savings")({ component: Savings });

function Savings() {
  const { user } = useAuth();
  const money = useMoney();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", target_amount: "", current_amount: "0", target_date: "" });

  const load = async () => { const { data } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: false }); setRows(data ?? []); };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!f.name || !f.target_amount) return toast.error("Name & target required");
    const { error } = await supabase.from("savings_goals").insert({ ...f, user_id: user!.id, target_amount: Number(f.target_amount), current_amount: Number(f.current_amount) || 0, target_date: f.target_date || null });
    if (error) return toast.error(error.message);
    toast.success("Goal created"); setOpen(false); setF({ name: "", target_amount: "", current_amount: "0", target_date: "" }); load();
  };
  const updateAmount = async (id: string, current: number, add: number) => {
    await supabase.from("savings_goals").update({ current_amount: current + add }).eq("id", id); load();
  };

  return (
    <div>
      <PageHeader title="Savings Goals" subtitle="Set targets and watch them grow." action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-primary text-primary-foreground hover:bg-primary/90">New goal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New savings goal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Goal name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Emergency fund" /></div>
              <div><Label>Target amount</Label><Input type="number" value={f.target_amount} onChange={(e) => setF({ ...f, target_amount: e.target.value })} /></div>
              <div><Label>Already saved</Label><Input type="number" value={f.current_amount} onChange={(e) => setF({ ...f, current_amount: e.target.value })} /></div>
              <div><Label>Target date</Label><Input type="date" value={f.target_date} onChange={(e) => setF({ ...f, target_date: e.target.value })} /></div>
              <Button onClick={save} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.length === 0 && <div className="md:col-span-2 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">No goals yet</div>}
        {rows.map((g) => {
          const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
          return (
            <div key={g.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between"><div className="font-display text-lg font-semibold">{g.name}</div><div className="text-sm text-muted-foreground">{pct}%</div></div>
              <Progress value={pct} className="mt-3" />
              <div className="mt-2 flex items-center justify-between text-sm"><span>{money(g.current_amount)}</span><span className="text-muted-foreground">of {money(g.target_amount)}</span></div>
              <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => updateAmount(g.id, Number(g.current_amount), 1000)}>+1,000</Button><Button size="sm" variant="outline" onClick={() => updateAmount(g.id, Number(g.current_amount), 5000)}>+5,000</Button></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
