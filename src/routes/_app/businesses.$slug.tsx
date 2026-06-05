import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page";
import { formatMoneyRange } from "@/lib/format";

export const Route = createFileRoute("/_app/businesses/$slug")({
  component: Detail,
});

function Detail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tpl, setTpl] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("business_templates").select("*").eq("slug", slug).single();
      setTpl(t);
      if (t) {
        const { data: s } = await supabase.from("business_template_steps").select("*").eq("template_id", t.id).order("step_number");
        setSteps(s ?? []);
      }
    })();
  }, [slug]);

  const start = async () => {
    if (!tpl || !user) return;
    setStarting(true);
    const { data, error } = await supabase.from("user_businesses").insert({
      user_id: user.id,
      template_id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      currency: tpl.currency,
    }).select().single();
    setStarting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Business added — let's start your roadmap");
    navigate({ to: "/roadmaps/$businessId", params: { businessId: data.id } });
  };

  if (!tpl) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div>
      <PageHeader title={tpl.name} subtitle={tpl.description} action={<Button onClick={start} disabled={starting} className="bg-primary text-primary-foreground hover:bg-primary/90">{starting ? "Starting…" : "Start this business"}</Button>} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase text-muted-foreground">Startup cost</div>
          <div className="mt-2 font-display text-xl font-bold">{formatMoneyRange(tpl.startup_cost_min, tpl.startup_cost_max, tpl.currency)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase text-muted-foreground">Monthly profit</div>
          <div className="mt-2 font-display text-xl font-bold text-success">{formatMoneyRange(tpl.monthly_profit_min, tpl.monthly_profit_max, tpl.currency)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase text-muted-foreground">Difficulty / time</div>
          <div className="mt-2 flex items-center gap-2"><Badge>{tpl.difficulty}</Badge><span className="text-sm">~{tpl.time_to_profit_months} mo</span></div>
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-display text-xl font-semibold">Roadmap ({steps.length} steps)</h2>
      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{s.step_number}</div>
              <div>
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm text-muted-foreground">{s.description}</div>
                <div className="mt-1 text-xs text-muted-foreground">Est. {s.est_days} day{s.est_days === 1 ? "" : "s"}</div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
