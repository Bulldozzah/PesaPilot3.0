import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, StatCard } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COUNTRIES, CURRENCIES, findCountry, formatCurrencyExample, type Country } from "@/lib/countries";

const searchSchema = z.object({ firstTimeSetup: z.boolean().optional() });

export const Route = createFileRoute("/_app/profile")({
  validateSearch: (s) => searchSchema.parse(s),
  component: Profile,
});

type ProfileRow = {
  full_name: string | null;
  country: string | null;
  currency: string | null;
  phone: string | null;
  business_name: string | null;
  completed_onboarding: boolean;
};

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { firstTimeSetup } = useSearch({ from: "/_app/profile" });

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [currency, setCurrency] = useState<string>("KES");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({ businesses: 0, savings: 0 });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { count: b }, { count: s }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_businesses").select("*", { count: "exact", head: true }),
        supabase.from("savings_goals").select("*", { count: "exact", head: true }),
      ]);
      const row = (p as ProfileRow | null) ?? null;
      if (row) {
        setFullName(row.full_name ?? "");
        const c = findCountry(row.country);
        setCountry(c);
        setCurrency(row.country ? row.currency ?? c.currency : c.currency);
        setPhone(row.phone ?? "");
        setBusinessName(row.business_name ?? "");
        setCompleted(!!row.completed_onboarding);
      }
      setStats({ businesses: b ?? 0, savings: s ?? 0 });
      setLoaded(true);
    })();
  }, [user]);

  const isFirstTime = firstTimeSetup || (loaded && !completed);

  const phonePrefix = country.dial;
  const phoneWithoutPrefix = useMemo(
    () => (phone.startsWith(phonePrefix) ? phone.slice(phonePrefix.length).trimStart() : phone),
    [phone, phonePrefix],
  );

  const save = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    setSaving(true);
    const fullPhone = phoneWithoutPrefix ? `${phonePrefix} ${phoneWithoutPrefix.trim()}` : "";
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        country: country.name,
        country_code: country.code,
        currency,
        phone: fullPhone,
        business_name: businessName.trim() || null,
        completed_onboarding: true,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    try {
      localStorage.setItem(
        "pp_profile",
        JSON.stringify({ full_name: fullName, country: country.name, currency, phone: fullPhone }),
      );
    } catch {
      // ignore storage failures
    }
    toast.success("Profile saved");
    setCompleted(true);
    navigate({ to: "/dashboard" });
  };

  return (
    <div>
      {isFirstTime && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 p-5 text-primary">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <Sparkles className="h-5 w-5" /> Welcome! Please complete your profile
          </div>
          <ul className="mt-2 list-disc pl-8 text-sm text-primary/90">
            <li>Enter your full name</li>
            <li>Select your country (this sets your currency)</li>
            <li>Add your phone number (optional)</li>
          </ul>
        </div>
      )}

      <PageHeader
        title={isFirstTime ? "Set up your profile" : "Your profile"}
        subtitle={isFirstTime ? "A few details so we can tailor Pilot-Pesa to you." : "Update your details and preferences."}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Personal information</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Wanjiku" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>
            <div>
              <Label htmlFor="business_name">Business name (optional)</Label>
              <Input id="business_name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Wanjiku Ventures" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Country & currency</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label>Country</Label>
              <CountryPicker
                value={country}
                onChange={(c) => {
                  setCountry(c);
                  setCurrency(c.currency);
                }}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone number</Label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  {phonePrefix}
                </span>
                <Input
                  id="phone"
                  className="rounded-l-none"
                  value={phoneWithoutPrefix}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="712 345 678"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-display text-2xl font-bold">
                    {country.currencySymbol} <span className="text-base font-medium text-muted-foreground">{currency}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {CURRENCIES.find((c) => c.currency === currency)?.currencyName ?? country.currencyName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Example</div>
                  <div className="font-medium">{formatCurrencyExample(currency)}</div>
                </div>
              </div>

              <div className="mt-3">
                <Label className="text-xs">Override currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.currency} value={c.currency}>
                        {c.currencySymbol} · {c.currency} — {c.currencyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {saving ? "Saving…" : isFirstTime ? "Complete profile" : "Save changes"}
        </Button>
      </div>

      <h2 className="mt-10 mb-3 font-display text-lg font-semibold">Account statistics</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active businesses" value={String(stats.businesses)} />
        <StatCard label="Currency" value={currency} hint={country.currencyName} />
        <StatCard label="Savings goals" value={String(stats.savings)} />
        <StatCard label="Country" value={`${country.flag} ${country.code}`} hint={country.name} />
      </div>
    </div>
  );
}

function CountryPicker({ value, onChange }: { value: Country; onChange: (c: Country) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.currency.toLowerCase().includes(q.toLowerCase()) ||
      c.dial.includes(q),
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <span className="text-lg">{value.flag}</span>
            <span>{value.name}</span>
            <span className="text-xs text-muted-foreground">· {value.currencySymbol} {value.currency} · {value.dial}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search country, currency or dial code"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="max-h-72 overflow-auto py-1">
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
                setQ("");
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{c.flag}</span>
                <span className="font-medium">{c.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">{c.currencySymbol} {c.currency} · {c.dial}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
