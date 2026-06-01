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
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/contacts")({ component: Contacts });

function Contacts() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "customer", name: "", email: "", phone: "", notes: "" });

  const load = async () => { const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false }); setRows(data ?? []); };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("contacts").insert({ ...form, user_id: user!.id, type: form.type as any });
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setForm({ type: "customer", name: "", email: "", phone: "", notes: "" }); load();
  };

  return (
    <div>
      <PageHeader title="Vendors & Customers" subtitle="Your business contact book." action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Add contact</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New contact</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="vendor">Vendor</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <Button onClick={save} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 && <div className="md:col-span-3 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">No contacts yet</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between"><div className="font-display text-lg font-semibold">{r.name}</div><Badge variant={r.type === "customer" ? "default" : "secondary"}>{r.type}</Badge></div>
            <div className="mt-1 text-sm text-muted-foreground">{r.email}</div>
            <div className="text-sm text-muted-foreground">{r.phone}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
