import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, LineChart, Map, PiggyBank, Shield, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pilot-Pesa — Your AI Co-pilot for Small Business" },
      {
        name: "description",
        content:
          "Browse 100+ business ideas, follow guided roadmaps, and track every shilling with double-entry accounting. Built for African entrepreneurs.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-mesh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-navy-gradient text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Pilot-Pesa</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</a>
          <a href="#how" className="text-sm font-medium text-muted-foreground hover:text-foreground">How it works</a>
          <a href="#who" className="text-sm font-medium text-muted-foreground hover:text-foreground">Who it's for</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/login">Log in</Link></Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-12 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            Built for African entrepreneurs
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            From <span className="text-primary">"I want to start"</span> to running a profitable business.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Pilot-Pesa is your personal business coach and bookkeeper. Browse 100+ vetted business
            ideas, follow guided roadmaps, and track every shilling with proper double-entry accounting.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/register">
                Start free — no card needed <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">119 business templates · 10 categories · Double-entry accounting</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            { icon: BookOpen, title: "Browse 100+ business ideas", desc: "From mama-mboga to mobile apps, with startup costs, profit ranges, and difficulty ratings." },
            { icon: Map, title: "Step-by-step roadmaps", desc: "Guided checklists for registration, licensing, capital, launch, and growth." },
            { icon: LineChart, title: "Real double-entry books", desc: "Journal entries, P&L, balance sheet, cash flow and trial balance — done for you." },
            { icon: Wallet, title: "Personal & business split", desc: "Keep household money clean from business money so you really know your profit." },
            { icon: PiggyBank, title: "Savings goals & lenders", desc: "Set targets and discover banks, SACCOs and digital lenders that fit your stage." },
            { icon: Shield, title: "Your data, secured", desc: "Bank-grade encryption and per-user data isolation. Your books stay yours." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="font-display text-3xl font-bold md:text-4xl">How Pilot-Pesa works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {[
              ["1", "Sign up", "Create your account and tell us your country and currency."],
              ["2", "Pick an idea", "Browse 119 business templates with real costs and profits."],
              ["3", "Follow the roadmap", "Tick off steps from registration to launch."],
              ["4", "Track every shilling", "Record journal entries and see live P&L, balance sheet and cash flow."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="font-display text-5xl font-bold text-primary/30">{n}</div>
                <h3 className="mt-2 font-display text-lg font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold md:text-5xl">
          Ready to pilot your money?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Free to start. Bring your idea — we'll bring the structure.
        </p>
        <Button asChild size="lg" className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/register">Create your free account <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </section>

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Pilot-Pesa</span>
          <span>Built for entrepreneurs, by entrepreneurs.</span>
        </div>
      </footer>
    </div>
  );
}
