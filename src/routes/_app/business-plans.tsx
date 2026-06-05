import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/business-plans")({ component: Plans });

const SECTIONS = ["Executive Summary","Business Description","Market Analysis","Products & Services","Marketing Strategy","Operations Plan","Financial Projections"];

function Plans() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const load = async () => { const { data } = await supabase.from("business_plans").select("*").order("updated_at", { ascending: false }); setRows(data ?? []); };
  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!title) return toast.error("Title required");
    const content: Record<string,string> = {};
    SECTIONS.forEach((s) => (content[s] = ""));
    const { data, error } = await supabase.from("business_plans").insert({ user_id: user!.id, title, content }).select().single();
    if (error) return toast.error(error.message);
    setTitle(""); setEditing(data); load();
  };
  const saveSection = async (key: string, val: string) => {
    const updated = { ...editing.content, [key]: val };
    setEditing({ ...editing, content: updated });
    await supabase.from("business_plans").update({ content: updated }).eq("id", editing.id);
  };
  const download = () => {
    const text = `${editing.title}\n\n` + SECTIONS.map((s) => `${s}\n${"=".repeat(s.length)}\n${editing.content[s] || ""}\n`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${editing.title}.txt`; a.click();
  };

  if (editing) {
    return (
      <div>
        <PageHeader title={editing.title} action={<div className="flex gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Back</Button><Button onClick={download} className="bg-primary text-primary-foreground hover:bg-primary/90"><Download className="mr-1 h-4 w-4"/>Download</Button></div>} />
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s} className="rounded-2xl border border-border bg-card p-5">
              <Label className="font-display text-lg">{s}</Label>
              <Textarea className="mt-2" rows={5} value={editing.content[s] || ""} onChange={(e) => saveSection(s, e.target.value)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Business Plans" subtitle="Draft, edit and export your business plans." />
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <div><Label>New plan title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Bakery Plan" /></div>
          <div className="flex items-end"><Button onClick={create} className="bg-primary text-primary-foreground hover:bg-primary/90">Create</Button></div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <button key={r.id} onClick={() => setEditing(r)} className="rounded-2xl border border-border bg-card p-5 text-left hover:border-primary/50">
            <div className="font-display text-lg font-semibold">{r.title}</div>
            <div className="text-xs text-muted-foreground">Updated {new Date(r.updated_at).toLocaleDateString()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
