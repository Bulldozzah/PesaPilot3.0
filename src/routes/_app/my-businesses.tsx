import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/my-businesses")({ component: My });

function My() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("user_businesses").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
  }, [user]);

  return (
    <div>
      <PageHeader title="My businesses" subtitle="The businesses you're piloting." action={<Button asChild><Link to="/businesses">Browse ideas</Link></Button>} />
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          You haven't started a business yet. <Link to="/businesses" className="text-primary hover:underline">Browse 119 ideas →</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <Link key={b.id} to="/roadmaps/$businessId" params={{ businessId: b.id }} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/50">
              <div className="font-display text-lg font-semibold">{b.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{b.description}</div>
              <div className="mt-3 text-xs text-muted-foreground">Started {new Date(b.started_at).toLocaleDateString()}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
