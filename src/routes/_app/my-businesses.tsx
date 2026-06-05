import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Circle,
  ExternalLink,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/my-businesses")({ component: MyBusinessPage, ssr: false });

type Step = { number: number; title: string; description: string; checklist: string[] };

const SAMPLE_STEPS: Step[] = [
  {
    number: 1,
    title: "Market Research",
    description: "Understand your target market and competitors",
    checklist: ["Identify target customers", "Analyze competitors", "Survey potential customers"],
  },
  {
    number: 2,
    title: "Licenses & Registration",
    description: "Register your business legally and get permits",
    checklist: [
      "Choose business structure",
      "Register with authorities",
      "Get tax ID",
      "Obtain necessary permits",
    ],
  },
  {
    number: 3,
    title: "Setup Location",
    description: "Find and prepare your business location",
    checklist: ["Scout locations", "Negotiate lease", "Setup workspace", "Install utilities"],
  },
  {
    number: 4,
    title: "Marketing & Branding",
    description: "Create brand identity and marketing strategy",
    checklist: [
      "Design logo & branding",
      "Create social media accounts",
      "Design marketing materials",
      "Plan launch campaign",
    ],
  },
  {
    number: 5,
    title: "Launch & Operations",
    description: "Buy equipment, start operations, and serve customers",
    checklist: [
      "List required equipment/stock",
      "Compare suppliers & purchase",
      "Hire staff if needed",
      "Set up POS/payment systems",
      "Open for business",
      "Track daily sales",
      "Manage inventory",
      "Handle customer service",
    ],
  },
];

type Business = {
  id: string;
  name: string;
  description: string | null;
  template_id: string | null;
  category?: string;
};

type Authority = {
  country_code: string;
  country_name: string;
  authority_name: string;
  authority_website: string | null;
};

type ProgressRow = {
  step_number: number;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  checklist_status: { text: string; checked: boolean }[];
};

function MyBusinessPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authority, setAuthority] = useState<Authority | null>(null);
  const [countryName, setCountryName] = useState<string>("");
  const [progress, setProgress] = useState<Record<number, ProgressRow>>({});
  const [openStep, setOpenStep] = useState<Step | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: bizs }, { data: profile }] = await Promise.all([
        supabase
          .from("user_businesses")
          .select("id, name, description, template_id")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("country, country_code").eq("id", user.id).single(),
      ]);
      const list = (bizs ?? []) as Business[];
      // enrich with category name
      const templateIds = list.map((b) => b.template_id).filter(Boolean) as string[];
      let categories: Record<string, string> = {};
      if (templateIds.length) {
        const { data: tpls } = await supabase
          .from("business_templates")
          .select("id, business_categories(name)")
          .in("id", templateIds);
        (tpls ?? []).forEach((t: any) => {
          categories[t.id] = t.business_categories?.name ?? "";
        });
      }
      const enriched = list.map((b) => ({
        ...b,
        category: b.template_id ? categories[b.template_id] : undefined,
      }));
      setBusinesses(enriched);
      if (enriched.length && !selectedId) setSelectedId(enriched[0].id);
      setCountryName(profile?.country ?? "");
      const code = (profile as any)?.country_code as string | undefined;
      let auth: Authority | null = null;
      if (code) {
        const { data } = await supabase
          .from("country_authorities")
          .select("*")
          .eq("country_code", code)
          .maybeSingle();
        auth = (data as Authority | null) ?? null;
      }
      if (!auth && profile?.country) {
        const { data } = await supabase
          .from("country_authorities")
          .select("*")
          .ilike("country_name", profile.country)
          .maybeSingle();
        auth = (data as Authority | null) ?? null;
      }
      setAuthority(auth);

    })();
  }, [user]);

  useEffect(() => {
    if (!selectedId) {
      setProgress({});
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("step_progress")
        .select("*")
        .eq("user_business_id", selectedId);
      const map: Record<number, ProgressRow> = {};
      (data ?? []).forEach((r: any) => {
        map[r.step_number] = {
          step_number: r.step_number,
          completed: r.completed,
          completed_at: r.completed_at,
          notes: r.notes,
          checklist_status: Array.isArray(r.checklist_status) ? r.checklist_status : [],
        };
      });
      setProgress(map);
    })();
  }, [selectedId]);

  const selected = businesses.find((b) => b.id === selectedId) ?? null;
  const completedCount = useMemo(
    () => Object.values(progress).filter((p) => p.completed).length,
    [progress],
  );

  const deleteBusiness = async () => {
    if (!selected) return;
    const { error } = await supabase.from("user_businesses").delete().eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success("Business deleted");
    setConfirmDelete(false);
    const rest = businesses.filter((b) => b.id !== selected.id);
    setBusinesses(rest);
    setSelectedId(rest[0]?.id ?? null);
  };

  if (!businesses.length) {
    return (
      <div>
        <PageHeader title="My business" subtitle="Manage and grow what you started." />
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          You haven't started a business yet.{" "}
          <Link to="/businesses" className="text-primary hover:underline">
            Browse ideas →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Selector pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {businesses.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedId(b.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              b.id === selectedId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            {b.name}
            {b.category ? <span className="opacity-70"> · {b.category}</span> : null}
          </button>
        ))}
        {selected && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        )}
      </div>

      {selected && (
        <PageHeader
          title={selected.name}
          subtitle={selected.category ?? selected.description ?? "Your business roadmap"}
        />
      )}

      {/* Progress overview */}
      <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>{completedCount} / {SAMPLE_STEPS.length} steps completed</span>
          <span className="text-muted-foreground">
            {Math.round((completedCount / SAMPLE_STEPS.length) * 100)}%
          </span>
        </div>
        <Progress value={(completedCount / SAMPLE_STEPS.length) * 100} className="mt-3" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roadmap */}
        <div className="space-y-3 lg:col-span-2">
          {SAMPLE_STEPS.map((step) => {
            const p = progress[step.number];
            const done = !!p?.completed;
            const checked = p?.checklist_status?.filter((c) => c.checked).length ?? 0;
            return (
              <button
                key={step.number}
                onClick={() => setOpenStep(step)}
                className="block w-full rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50"
              >
                <div className="flex items-start gap-3">
                  {done ? (
                    <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-6 w-6 flex-shrink-0 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-base font-semibold">
                        {step.number}. {step.title}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          done
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-amber-500/15 text-amber-600"
                        }`}
                      >
                        {done ? "Done" : "Pending"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{step.description}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {checked}/{step.checklist.length} tasks done
                      </span>
                      <span className="text-primary">Click to manage progress →</span>
                    </div>

                    {step.title === "Licenses & Registration" && authority && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs">
                        <Building2 className="mt-0.5 h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-semibold text-blue-700 dark:text-blue-300">
                            {countryName || authority.country_name} Registration Authority
                          </div>
                          <div className="text-blue-900/80 dark:text-blue-100/80">
                            {authority.authority_name}
                          </div>
                          {authority.authority_website && (
                            <a
                              href={authority.authority_website}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                            >
                              Visit Official Website <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* AI Advisor */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">AI Business Advisor</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask anything about running your business.
            </p>
            <AdvisorChat />
          </div>
        </aside>
      </div>

      {/* Step modal */}
      {openStep && (
        <StepModal
          step={openStep}
          progress={progress[openStep.number]}
          authority={openStep.title === "Licenses & Registration" ? authority : null}
          countryName={countryName}
          onClose={() => setOpenStep(null)}
          onSaved={(row) => {
            setProgress((m) => ({ ...m, [openStep.number]: row }));
            setOpenStep(null);
          }}
          userBusinessId={selected!.id}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this business?</DialogTitle>
            <DialogDescription>
              This permanently removes "{selected?.name}" and all its progress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteBusiness}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdvisorChat() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi! Ask me anything about your business strategy." },
  ]);
  const [input, setInput] = useState("");
  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      {
        role: "ai",
        text: "That's a great question! Based on your business type, I recommend focusing on your customers first and validating demand before spending on inventory.",
      },
    ]);
    setInput("");
  };
  return (
    <>
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 ${
              m.role === "ai"
                ? "bg-card text-foreground"
                : "ml-6 bg-primary text-primary-foreground"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask the advisor…"
        />
        <Button size="icon" onClick={send}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function StepModal({
  step,
  progress,
  authority,
  countryName,
  userBusinessId,
  onClose,
  onSaved,
}: {
  step: Step;
  progress?: ProgressRow;
  authority: Authority | null;
  countryName: string;
  userBusinessId: string;
  onClose: () => void;
  onSaved: (row: ProgressRow) => void;
}) {
  const initialChecklist =
    progress?.checklist_status?.length === step.checklist.length
      ? progress.checklist_status
      : step.checklist.map((t) => ({
          text: t,
          checked: progress?.checklist_status?.find((c) => c.text === t)?.checked ?? false,
        }));

  const [items, setItems] = useState(initialChecklist);
  const [notes, setNotes] = useState(progress?.notes ?? "");
  const [date, setDate] = useState(
    progress?.completed_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const allDone = items.every((i) => i.checked);
  const remaining = items.filter((i) => !i.checked).length;

  const toggle = (idx: number) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it)));
  const markAll = () => setItems((arr) => arr.map((it) => ({ ...it, checked: true })));

  const save = async () => {
    setSaving(true);
    const payload = {
      user_business_id: userBusinessId,
      step_number: step.number,
      step_title: step.title,
      completed: allDone,
      completed_at: allDone ? new Date(date).toISOString() : null,
      notes: notes || null,
      checklist_status: items,
    };
    const { error } = await supabase
      .from("step_progress")
      .upsert(payload, { onConflict: "user_business_id,step_number" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(allDone ? "Step completed!" : "Progress saved");
    onSaved({
      step_number: step.number,
      completed: allDone,
      completed_at: payload.completed_at,
      notes: payload.notes,
      checklist_status: items,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Step {step.number}: {step.title}
          </DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        {step.title === "Licenses & Registration" && authority && (
          <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {countryName || authority.country_name} Business Registration
                </div>
                <div className="mt-0.5 font-display text-base font-semibold">
                  {authority.authority_name}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Register your business with the official authority to operate legally.
                </p>
                {authority.authority_website && (
                  <a
                    href={authority.authority_website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Visit Official Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Checklist</h4>
            {!allDone && (
              <button onClick={markAll} className="text-xs text-primary hover:underline">
                ✓ Mark all as complete
              </button>
            )}
          </div>
          <ul className="space-y-1.5">
            {items.map((it, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors ${
                  it.checked
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-border bg-card"
                }`}
              >
                <Checkbox checked={it.checked} onCheckedChange={() => toggle(i)} />
                <span className={it.checked ? "line-through text-muted-foreground" : ""}>
                  {it.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Completion date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember about this step…"
          />
        </div>

        {step.title !== "Licenses & Registration" && (
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-xs text-primary hover:underline"
          >
            ▶ Watch Tutorial Video
          </a>
        )}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {remaining === 0 ? "All tasks complete" : `${remaining} task(s) remaining`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {allDone ? (
              <Button
                onClick={save}
                disabled={saving}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {saving ? "Saving…" : "Save & Complete"}
              </Button>
            ) : (
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save Progress"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
