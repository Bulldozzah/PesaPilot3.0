import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, StatCard, QuickAction } from "@/components/page";
import { useMoney } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PesaPilot" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const money = useMoney();
  const [stats, setStats] = useState({ businesses: 0, journalEntries: 0, savingsGoals: 0, personalNet: 0 });
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: b }, { count: j }, { count: s }, { data: pt }, { data: p }] = await Promise.all([
        supabase.from("user_businesses").select("*", { count: "exact", head: true }),
        supabase.from("journal_entries").select("*", { count: "exact", head: true }),
        supabase.from("savings_goals").select("*", { count: "exact", head: true }),
        supabase.from("personal_transactions").select("type,amount"),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      ]);
      const net = (pt ?? []).reduce((acc, t) => acc + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);
      setStats({ businesses: b ?? 0, journalEntries: j ?? 0, savingsGoals: s ?? 0, personalNet: net });
      setName(p?.full_name ?? "");
    })();
  }, [user]);

  return (
    <div>
      <PageHeader title={`Karibu, ${name || user?.email?.split("@")[0]} 👋`} subtitle="Here's a snapshot of your business and money." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="My businesses" value={String(stats.businesses)} hint="Active business profiles" />
        <StatCard label="Journal entries" value={String(stats.journalEntries)} hint="Total recorded" />
        <StatCard label="Savings goals" value={String(stats.savingsGoals)} hint="In progress" />
        <StatCard label="Personal net" value={money(stats.personalNet)} accent={stats.personalNet >= 0 ? "success" : "destructive"} hint="Income − expenses" />
      </div>

      <h2 className="mt-10 mb-3 font-display text-lg font-semibold">Quick actions</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <QuickAction to="/businesses" title="Browse business ideas" desc="119 vetted templates across 10 categories" />
        <QuickAction to="/accounting/journal" title="Record a journal entry" desc="Keep your double-entry books current" />
        <QuickAction to="/savings" title="Set a savings goal" desc="Track progress toward your target" />
        <QuickAction to="/lenders" title="Find a lender" desc="Banks, SACCOs and digital options" />
        <QuickAction to="/personal" title="Log personal money" desc="Keep household separate from business" />
        <QuickAction to="/business-plans" title="Draft a business plan" desc="Export a polished overview" />
      </div>
    </div>
  );
}
