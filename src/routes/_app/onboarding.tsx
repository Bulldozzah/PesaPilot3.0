import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInCalendarDays } from "date-fns";
import {
  Briefcase, Wallet, Calendar as CalendarIcon, TrendingUp, Target,
  ChevronLeft, ChevronRight, X, Search, CheckCircle2, BookOpen,
  Building2, PiggyBank,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";

type Template = {
  id: string; name: string; description: string | null;
  category_id: string | null; currency: string;
  monthly_profit_min: number; monthly_profit_max: number;
  startup_cost_min: number;
};

type Search = { templateId?: string };

export const Route = createFileRoute("/_app/onboarding")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    templateId: typeof s.templateId === "string" ? s.templateId : undefined,
  }),
  head: () => ({ meta: [{ title: "Onboarding — Pilot-Pesa" }] }),
  component: Onboarding,
});

const STEPS = [
  { icon: Briefcase, title: "Choose Your Business" },
  { icon: Briefcase, title: "Name Your Business" },
  { icon: Wallet, title: "Understanding Your Accounting System" },
  { icon: CalendarIcon, title: "Select Start Date" },
  { icon: TrendingUp, title: "Set Your Profit Target" },
  { icon: Target, title: "Review & Start!" },
];

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { templateId } = Route.useSearch();
  const currency = "KES";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [step, setStep] = useState(templateId ? 1 : 0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [profit, setProfit] = useState<string>("");
  const [search, setSearch] = useState("");
  const [profilePromptOpen, setProfilePromptOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load templates + check profile
  useEffect(() => {
    supabase.from("business_templates").select("*").order("name")
      .then(({ data }) => {
        const list = (data as Template[]) ?? [];
        setTemplates(list);
        if (templateId) {
          const t = list.find((x) => x.id === templateId);
          if (t) { setSelected(t); setName(t.name); }
        }
      });
  }, [templateId]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("completed_onboarding, full_name, country, currency")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        const complete = !!data?.completed_onboarding && !!data?.full_name?.trim();
        if (!complete) setProfilePromptOpen(true);
      });
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
  }, [templates, search]);

  const canProceed = (() => {
    switch (step) {
      case 0: return !!selected;
      case 1: return name.trim().length > 0;
      case 2: return true;
      case 3: return !!startDate;
      case 4: return !!profit && Number(profit) > 0;
      case 5: return true;
      default: return false;
    }
  })();

  const next = () => { setDirection(1); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => { setDirection(-1); setStep((s) => Math.max(s - 1, templateId ? 1 : 0)); };

  const skipAll = async () => {
    navigate({ to: "/dashboard" });
  };

  const finish = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("user_businesses").insert({
      user_id: user.id,
      template_id: selected.id,
      name: name.trim(),
      description: selected.description,
      currency: selected.currency || currency,
      budget: 10000,
      start_date: startDate,
      expected_monthly_profit: Number(profit),
    }).select().single();
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    toast.success("Your business is live! 🚀");
    navigate({ to: "/my-businesses" });
  };

  const profitNum = Number(profit || 0);
  const daysFromToday = startDate ? differenceInCalendarDays(new Date(startDate), new Date()) : null;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header & progress */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </div>
          <h1 className="font-display text-2xl font-bold">{STEPS[step].title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={skipAll}>Skip</Button>
          <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-8 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
          initial={false}
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Step body */}
      <div className="relative min-h-[420px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            {step === 0 && (
              <StepChoose
                search={search} setSearch={setSearch}
                templates={filtered} selected={selected}
                onSelect={(t) => { setSelected(t); if (!name) setName(t.name); }}
              />
            )}
            {step === 1 && selected && (
              <StepName selected={selected} name={name} setName={setName} />
            )}
            {step === 2 && <StepAccounting />}
            {step === 3 && (
              <StepDate startDate={startDate} setStartDate={setStartDate} daysFromToday={daysFromToday} />
            )}
            {step === 4 && selected && (
              <StepProfit selected={selected} profit={profit} setProfit={setProfit} profitNum={profitNum} />
            )}
            {step === 5 && selected && (
              <StepReview
                selected={selected} name={name} startDate={startDate}
                profitNum={profitNum}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={prev} disabled={step === 0 || (templateId ? step === 1 : false)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={!canProceed}>
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? "Starting…" : "Start My Business 🚀"}
          </Button>
        )}
      </div>

      {/* Profile prompt */}
      <Dialog open={profilePromptOpen} onOpenChange={setProfilePromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete your profile first?</DialogTitle>
            <DialogDescription>
              Setting your country, currency, and name helps personalize your financials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProfilePromptOpen(false)}>Skip for Now</Button>
            <Button onClick={() => navigate({ to: "/profile" })}>Complete Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel onboarding?</DialogTitle>
            <DialogDescription>Are you sure? Progress will not be saved.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep going</Button>
            <Button variant="destructive" onClick={() => navigate({ to: "/dashboard" })}>Yes, cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepChoose({ search, setSearch, templates, selected, onSelect }: {
  search: string; setSearch: (v: string) => void;
  templates: Template[]; selected: Template | null;
  onSelect: (t: Template) => void;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Select from {templates.length} business types or search for your idea.
      </p>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search businesses…" className="pl-9" />
      </div>
      <div className="grid max-h-[340px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={`rounded-xl border p-3 text-left transition ${selected?.id === t.id ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
          >
            <div className="font-display font-semibold">{t.name}</div>
            <div className="line-clamp-2 text-xs text-muted-foreground">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepName({ selected, name, setName }: { selected: Template; name: string; setName: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
        <span className="font-semibold">Business Type:</span> {selected.name}
      </div>
      <div>
        <Label htmlFor="bname">Business Name</Label>
        <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John's Poultry Farm" className="mt-1.5" />
      </div>
    </div>
  );
}

function StepAccounting() {
  const items = [
    { icon: BookOpen, title: "Double-Entry Accounting", desc: "Every transaction debits and credits to keep books balanced." },
    { icon: TrendingUp, title: "Comprehensive Reports", desc: "Income Statement, Balance Sheet, Cash Flow, Tax Reports." },
    { icon: Building2, title: "Bank Accounts Integration", desc: "Link bank accounts and reconcile statements easily." },
    { icon: PiggyBank, title: "Personal Wallet Planner", desc: "Separate personal finance management from your business." },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pilot-Pesa gives you a complete accounting system out of the box.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.title} className="rounded-xl border border-border bg-background p-4">
            <it.icon className="mb-2 h-5 w-5 text-primary" />
            <div className="font-display font-semibold">{it.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{it.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDate({ startDate, setStartDate, daysFromToday }: {
  startDate: string; setStartDate: (v: string) => void; daysFromToday: number | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="sdate">Planned Launch Date</Label>
        <Input id="sdate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5" />
      </div>
      <div className="rounded-xl bg-muted/50 p-4 text-sm">
        <div className="font-semibold">What is a Start Date?</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>The day you plan to officially open for business.</li>
          <li>Used to schedule your roadmap milestones.</li>
          <li>You can change this later if plans shift.</li>
        </ul>
      </div>
      {startDate && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40">
          <div className="font-display text-lg font-semibold text-emerald-900 dark:text-emerald-100">
            {format(new Date(startDate), "EEEE, MMMM d, yyyy")}
          </div>
          <div className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
            {daysFromToday === 0 ? "Today" : daysFromToday && daysFromToday > 0 ? `${daysFromToday} day${daysFromToday === 1 ? "" : "s"} from today` : `${Math.abs(daysFromToday ?? 0)} day(s) ago`}
          </div>
        </div>
      )}
    </div>
  );
}

function StepProfit({ selected, profit, setProfit, profitNum }: {
  selected: Template; profit: string; setProfit: (v: string) => void; profitNum: number;
}) {
  const c = selected.currency || "KES";
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-muted/50 p-4 text-sm">
        <span className="font-semibold">Suggested Monthly Profit:</span> {formatMoney(selected.monthly_profit_min, c)}
      </div>
      <div>
        <Label htmlFor="profit">Monthly Profit Target ({c})</Label>
        <Input id="profit" type="number" min="0" value={profit} onChange={(e) => setProfit(e.target.value)} placeholder="e.g. 50000" className="mt-1.5" />
        <p className="mt-2 text-xs text-muted-foreground">Profit = Revenue − OPEX</p>
      </div>
      {profitNum > 0 && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Daily Target" value={formatMoney(profitNum / 30, c)} />
          <Stat label="Monthly Target" value={formatMoney(profitNum, c)} highlight />
          <Stat label="Quarterly" value={formatMoney(profitNum * 3, c)} />
          <Stat label="Annual" value={formatMoney(profitNum * 12, c)} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40" : "border-border bg-background"}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-base font-bold ${highlight ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{value}</div>
    </div>
  );
}

function StepReview({ selected, name, startDate, profitNum }: {
  selected: Template; name: string; startDate: string; profitNum: number;
}) {
  const c = selected.currency || "KES";
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900/50 dark:bg-emerald-950/40">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <div className="mt-2 font-display text-xl font-bold text-emerald-900 dark:text-emerald-100">
          Ready to Start Your Journey?
        </div>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
          Click "Start My Business" to begin!
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Row k="Business Type" v={selected.name} />
        <Row k="Business Name" v={name} />
        <Row k="Start Date" v={startDate ? format(new Date(startDate), "PPP") : "—"} />
        <Row k="Monthly Profit Target" v={formatMoney(profitNum, c)} />
        <Row k="Budget" v={formatMoney(10000, c)} />
        <Row k="Currency" v={c} />
      </dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 font-medium">{v}</dd>
    </div>
  );
}
