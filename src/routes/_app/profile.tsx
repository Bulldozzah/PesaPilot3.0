import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const { user } = useAuth();
  const [f, setF] = useState<any>({ full_name: "", country: "Kenya", currency: "KES", phone: "", business_name: "" });
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => data && setF(data));
  }, [user]);
  const save = async () => {
    const { error } = await supabase.from("profiles").update({ ...f, completed_onboarding: true }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };
  return (
    <div>
      <PageHeader title="Your profile" subtitle="Update your details and preferences." />
      <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-6">
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>Full name</Label><Input value={f.full_name || ""} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Country</Label><Input value={f.country || ""} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
          <div><Label>Currency</Label><Input value={f.currency || ""} onChange={(e) => setF({ ...f, currency: e.target.value })} /></div>
        </div>
        <div><Label>Phone</Label><Input value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>Business name</Label><Input value={f.business_name || ""} onChange={(e) => setF({ ...f, business_name: e.target.value })} /></div>
        <Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
      </div>
    </div>
  );
}
