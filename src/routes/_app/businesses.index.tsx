import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Tag, DollarSign, TrendingUp, Clock, Lock, Plus, X, Download, Play, Globe, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";

type Category = { id: string; name: string; slug: string; emoji: string | null; icon: string | null };
type Template = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  startup_cost_min: number;
  startup_cost_max: number;
  monthly_profit_min: number;
  monthly_profit_max: number;
  difficulty: "easy" | "medium" | "hard";
  time_to_profit_months: number;
  currency: string;
  image_url: string | null;
  overview_content: string | null;
  overview_video_url: string | null;
  overview_web_url: string | null;
  overview_pdf_url: string | null;
};

export const Route = createFileRoute("/_app/businesses/")({
  head: () => ({ meta: [{ title: "Start Your Business Journey — Pilot-Pesa" }] }),
  component: Discovery,
});

const difficultyLabel = { easy: "Beginner", medium: "Intermediate", hard: "Advanced" } as const;
const difficultyClasses = {
  easy: "bg-emerald-500/90 text-white",
  medium: "bg-amber-500/90 text-white",
  hard: "bg-rose-500/90 text-white",
} as const;

function Discovery() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState<Category[]>([]);
  const [tpls, setTpls] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Template | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    supabase.from("business_categories").select("*").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("business_templates").select("*").order("name").then(({ data }) => setTpls((data as Template[]) ?? []));
  }, []);

  const catById = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);
  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    tpls.forEach((t) => { if (t.category_id) map[t.category_id] = (map[t.category_id] ?? 0) + 1; });
    return map;
  }, [tpls]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tpls.filter((t) => {
      if (catFilter !== "all" && t.category_id !== catFilter) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    });
  }, [tpls, search, catFilter]);

  const startBusiness = async (t: Template) => {
    if (!user) { navigate({ to: "/register" }); return; }
    setStarting(true);
    const { data, error } = await supabase.from("user_businesses").insert({
      user_id: user.id,
      template_id: t.id,
      name: t.name,
      description: t.description,
      currency: t.currency,
    }).select().single();
    setStarting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${t.name} added to your businesses`);
    navigate({ to: "/roadmaps/$businessId", params: { businessId: data.id } });
  };

  const downloadOverview = (t: Template) => {
    const cat = t.category_id ? catById[t.category_id]?.name ?? "" : "";
    const text = [
      t.name,
      cat ? `Category: ${cat}` : "",
      "",
      t.description ?? "",
      "",
      `Startup cost: ${formatMoney(t.startup_cost_min, t.currency)}`,
      `Monthly profit: ${formatMoney(t.monthly_profit_min, t.currency)}`,
      `Difficulty: ${difficultyLabel[t.difficulty]}`,
      `Estimated breakeven: ~${Math.max(1, Math.round(t.startup_cost_min / (t.monthly_profit_min || 1)))} months`,
      "",
      t.overview_content ?? "",
    ].filter(Boolean).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.slug}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Start Your Business Journey 🚀</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse {tpls.length} business types across {cats.length} categories and get step-by-step guidance to launch your dream business
        </p>
      </div>

      {/* Sticky search & filter bar */}
      <div className="sticky top-14 z-20 -mx-6 mb-6 bg-background/95 px-6 py-4 backdrop-blur border-b border-border">
        <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name or description…"
              className="pl-9"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories ({tpls.length})</SelectItem>
              {cats.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.emoji ?? c.icon} {c.name} ({catCounts[c.id] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm text-muted-foreground">
            Showing {filtered.length} of {tpls.length}
          </div>
        </div>

        {/* Create Custom Business */}
        <button
          onClick={() => isAuthenticated ? navigate({ to: "/my-businesses" }) : navigate({ to: "/register" })}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-left transition hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display font-semibold text-primary">Create Custom Business</div>
              <div className="text-xs text-muted-foreground">Don't see your idea? Start from scratch.</div>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => {
          const cat = t.category_id ? catById[t.category_id] : undefined;
          const breakeven = Math.max(1, Math.round(t.startup_cost_min / (t.monthly_profit_min || 1)));
          return (
            <article key={t.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/70 via-purple-500/60 to-fuchsia-500/60">
                {t.image_url && (
                  <img src={t.image_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                {!isAuthenticated && (
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                    <Lock className="h-3 w-3" /> Sign up to access
                  </div>
                )}
                <span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${difficultyClasses[t.difficulty]}`}>
                  {difficultyLabel[t.difficulty]}
                </span>
                {cat && (
                  <span className="absolute bottom-2 left-2 text-2xl drop-shadow-lg" aria-hidden>
                    {cat.emoji ?? cat.icon}
                  </span>
                )}
              </div>
              <div className="space-y-3 p-4">
                {cat && (
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Tag className="h-3 w-3" /> {cat.name}
                  </div>
                )}
                <h3 className="font-display text-lg font-bold leading-tight">{t.name}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                <div className="space-y-1.5 border-t border-border pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Startup:</span>
                    <span className="ml-auto font-semibold">{formatMoney(t.startup_cost_min, t.currency)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-muted-foreground">Monthly profit:</span>
                    <span className="ml-auto font-semibold text-emerald-600">{formatMoney(t.monthly_profit_min, t.currency)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Breakeven:</span>
                    <span className="ml-auto font-semibold">~{breakeven} months</span>
                  </div>
                </div>
                {isAuthenticated ? (
                  <Button className="w-full" onClick={() => setSelected(t)}>View Details</Button>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/register" })}>
                    <Lock className="mr-2 h-4 w-4" /> Sign Up to View
                  </Button>
                )}
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            No businesses match your search.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          {selected && <DetailBody t={selected} cat={selected.category_id ? catById[selected.category_id] : undefined} onClose={() => setSelected(null)} onStart={() => startBusiness(selected)} onDownload={() => downloadOverview(selected)} starting={starting} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailBody({ t, cat, onClose, onStart, onDownload, starting }: {
  t: Template;
  cat: Category | undefined;
  onClose: () => void;
  onStart: () => void;
  onDownload: () => void;
  starting: boolean;
}) {
  const diffColor = t.difficulty === "easy" ? "text-emerald-600" : t.difficulty === "medium" ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex max-h-[90vh] flex-col">
      <DialogHeader className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="font-display text-2xl">{t.name}</DialogTitle>
            {cat && <div className="mt-1 text-sm text-muted-foreground">{cat.emoji ?? cat.icon} {cat.name}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Quick stats */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-blue-500/5 p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">Startup Cost</div>
            <div className="mt-1 font-display text-xl font-bold text-blue-600">{formatMoney(t.startup_cost_min, t.currency)}</div>
          </div>
          <div className="rounded-xl border border-border bg-emerald-500/5 p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">Monthly Profit</div>
            <div className="mt-1 font-display text-xl font-bold text-emerald-600">{formatMoney(t.monthly_profit_min, t.currency)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">Difficulty</div>
            <div className={`mt-1 font-display text-xl font-bold ${diffColor}`}>{difficultyLabel[t.difficulty]}</div>
          </div>
        </div>

        {/* Resource links */}
        {(t.overview_video_url || t.overview_web_url || t.overview_pdf_url) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {t.overview_video_url && (
              <a href={t.overview_video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
                <Play className="h-4 w-4" /> Watch Video
              </a>
            )}
            {t.overview_web_url && (
              <a href={t.overview_web_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
                <Globe className="h-4 w-4" /> Learn More
              </a>
            )}
            {t.overview_pdf_url && (
              <a href={t.overview_pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
                <FileText className="h-4 w-4" /> Download PDF Guide
              </a>
            )}
          </div>
        )}

        {/* Overview content */}
        <div className="mt-6 space-y-5">
          {t.overview_content ? (
            <RichOverview text={t.overview_content} />
          ) : (
            <GenericOverview t={t} />
          )}
        </div>
      </div>

      <DialogFooter className="border-t border-border bg-card/50 px-6 py-3 sm:justify-between">
        <Button variant="outline" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" /> Download Overview
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={onStart} disabled={starting}>
            {starting ? "Starting…" : "Start This Business"}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}

function RichOverview({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) return <h3 key={i} className="font-display text-lg font-semibold">{b.replace(/^##\s+/, "")}</h3>;
        const lines = b.split("\n");
        if (lines.every((l) => /^-\s+/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{l.replace(/^-\s+/, "")}</li>)}</ul>;
        }
        if (lines.every((l) => /^\d+\.\s+/.test(l))) {
          return <ol key={i} className="list-decimal space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{l.replace(/^\d+\.\s+/, "")}</li>)}</ol>;
        }
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}

function GenericOverview({ t }: { t: Template }) {
  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="font-display text-lg font-semibold">What You Need to Know</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>{t.description}</li>
          <li>Typical startup investment around {formatMoney(t.startup_cost_min, t.currency)}.</li>
          <li>Expected monthly profit around {formatMoney(t.monthly_profit_min, t.currency)} once established.</li>
          <li>Most operators reach profitability in about {t.time_to_profit_months} month{t.time_to_profit_months === 1 ? "" : "s"}.</li>
        </ul>
      </section>
      <section className="rounded-xl bg-amber-500/10 p-4">
        <h3 className="font-display text-lg font-semibold">What You'll Need</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Starting capital of at least {formatMoney(t.startup_cost_min, t.currency)}</li>
          <li>A suitable location or workspace</li>
          <li>Basic equipment and supplies for {t.name.toLowerCase()}</li>
          <li>Required business permits and licenses</li>
          <li>A simple plan for finding your first customers</li>
        </ol>
      </section>
      <section className="rounded-xl bg-emerald-500/10 p-4">
        <h3 className="font-display text-lg font-semibold">💡 Tips for Success</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Start small and reinvest profits to grow steadily.</li>
          <li>Track every shilling — use the wallet planner and journal.</li>
          <li>Build relationships with reliable suppliers and loyal customers.</li>
          <li>Use the step-by-step roadmap to stay on track week by week.</li>
        </ul>
      </section>
    </div>
  );
}
