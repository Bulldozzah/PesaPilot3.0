import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/roadmaps/$businessId")({ component: View });

function View() {
  const { businessId } = Route.useParams();
  const [business, setBusiness] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  const load = async () => {
    const { data: b } = await supabase.from("user_businesses").select("*").eq("id", businessId).single();
    setBusiness(b);
    if (b?.template_id) {
      const { data: s } = await supabase.from("business_template_steps").select("*").eq("template_id", b.template_id).order("step_number");
      setSteps(s ?? []);
      const { data: p } = await supabase.from("user_roadmap_progress").select("*").eq("user_business_id", businessId);
      const map: Record<string, boolean> = {};
      (p ?? []).forEach((row: any) => (map[row.step_id] = row.completed));
      setProgress(map);
    }
  };
  useEffect(() => { load(); }, [businessId]);

  const toggle = async (stepId: string) => {
    const next = !progress[stepId];
    setProgress((p) => ({ ...p, [stepId]: next }));
    await supabase.from("user_roadmap_progress").upsert({
      user_business_id: businessId,
      step_id: stepId,
      completed: next,
      completed_at: next ? new Date().toISOString() : null,
    }, { onConflict: "user_business_id,step_id" });
  };

  if (!business) return <div className="text-muted-foreground">Loading…</div>;
  const done = Object.values(progress).filter(Boolean).length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;

  return (
    <div>
      <PageHeader title={business.name} subtitle={business.description} />
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Roadmap progress</span>
          <span className="text-muted-foreground">{done} / {steps.length}</span>
        </div>
        <Progress value={pct} className="mt-3" />
      </div>
      <ol className="space-y-3">
        {steps.map((s) => {
          const isDone = !!progress[s.id];
          return (
            <li key={s.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <button onClick={() => toggle(s.id)} className="mt-0.5 flex-shrink-0">
                {isDone ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />}
              </button>
              <div className="flex-1">
                <div className={`font-semibold ${isDone ? "line-through text-muted-foreground" : ""}`}>{s.step_number}. {s.title}</div>
                <div className="text-sm text-muted-foreground">{s.description}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
