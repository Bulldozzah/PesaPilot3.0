import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, X, Building2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export type Microfin = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  country: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  min_loan: number | null;
  max_loan: number | null;
  interest_rate_min: number | null;
  interest_rate_max: number | null;
  required_documents: string[];
  is_active: boolean;
};

const DOC_OPTIONS = [
  "NRC",
  "Proof of Residence",
  "Salary Slip",
  "Bank Statement",
  "Passport Photo",
  "Employment Letter",
  "Business Registration",
  "Collateral Documents",
];

const emptyForm = (): Partial<Microfin> => ({
  name: "",
  description: "",
  logo_url: "",
  address: "",
  country: "Zambia",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  min_loan: null,
  max_loan: null,
  interest_rate_min: null,
  interest_rate_max: null,
  required_documents: [],
  is_active: true,
});

export function MicrofinanceManager({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Microfin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Microfin | null>(null);
  const [form, setForm] = useState<Partial<Microfin>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Microfin | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("microfinance_institutions")
      .select("*")
      .order("name");
    setRows((data ?? []) as Microfin[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (m: Microfin) => {
    setEditing(m);
    setForm({ ...m });
    setShowForm(true);
  };

  const set = (field: keyof Microfin, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const toggleDoc = (doc: string) => {
    setForm((f) => {
      const list = f.required_documents ?? [];
      return {
        ...f,
        required_documents: list.includes(doc)
          ? list.filter((d) => d !== doc)
          : [...list, doc],
      };
    });
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("microfinance-logos")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error(`Logo upload failed: ${error.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("microfinance-logos").getPublicUrl(path);
    set("logo_url", data.publicUrl);
    setUploading(false);
    toast.success("Logo uploaded");
  };

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Name is required");
    setSaving(true);
    await supabase.auth.refreshSession().catch(() => undefined);
    const payload = {
      name: form.name!.trim(),
      description: form.description?.trim() || null,
      logo_url: form.logo_url?.trim() || null,
      address: form.address?.trim() || null,
      country: form.country?.trim() || "Zambia",
      phone: form.phone?.trim() || null,
      whatsapp: form.whatsapp?.trim() || null,
      email: form.email?.trim() || null,
      website: form.website?.trim() || null,
      min_loan: form.min_loan ?? null,
      max_loan: form.max_loan ?? null,
      interest_rate_min: form.interest_rate_min ?? null,
      interest_rate_max: form.interest_rate_max ?? null,
      required_documents: form.required_documents ?? [],
      is_active: form.is_active ?? true,
    };
    let error;
    if (editing) {
      ({ error } = await supabase
        .from("microfinance_institutions")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await supabase
        .from("microfinance_institutions")
        .insert({ ...payload, created_by: userId }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Institution updated" : "Institution created");
    setShowForm(false);
    load();
  };

  const del = async (m: Microfin) => {
    const { error } = await supabase
      .from("microfinance_institutions")
      .delete()
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setConfirmDelete(null);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Microfinance Institutions</h2>
          <p className="text-sm text-muted-foreground">Create and manage microfinance profiles shown to users.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New Institution</Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          No institutions yet. Click <b>New Institution</b> to add one.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((m) => (
            <div key={m.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                {m.logo_url
                  ? <img src={m.logo_url} alt={m.name} className="h-full w-full object-cover" />
                  : <Building2 className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold">{m.name}</span>
                  {!m.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">Hidden</span>}
                </div>
                <div className="text-xs text-muted-foreground">{m.address ?? "—"} · {m.country}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {m.phone && <span>☎ {m.phone}</span>}
                  {m.whatsapp && <span>WhatsApp {m.whatsapp}</span>}
                  {m.email && <span>✉ {m.email}</span>}
                  {m.website && <a href={m.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">site <ExternalLink className="h-3 w-3" /></a>}
                </div>
                {m.required_documents.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {m.required_documents.map((d) => (
                      <span key={d} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">{d}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Institution" : "New Institution"}</DialogTitle>
            <DialogDescription>Profile details shown to users in Lenders & Microfinance.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Logo */}
            <div>
              <Label>Logo / Picture</Label>
              <div className="mt-1 flex items-center gap-3">
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-muted">
                  {form.logo_url
                    ? <img src={form.logo_url} alt="logo" className="h-full w-full object-cover" />
                    : <Building2 className="h-6 w-6 text-muted-foreground" />}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
                />
                <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading…" : "Upload"}
                </Button>
                {form.logo_url && <Button type="button" variant="ghost" size="icon" onClick={() => set("logo_url", "")}><X className="h-4 w-4" /></Button>}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Name *</Label><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Bayport Financial Services" /></div>
              <div><Label>Country</Label><Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} placeholder="Zambia" /></div>
            </div>

            <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Short summary of the loan products offered." /></div>

            <div><Label>Address</Label><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Bayport House, Cairo Road, Lusaka" /></div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+260 211 123456" /></div>
              <div><Label>WhatsApp number</Label><Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+260977000000" /></div>
              <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="info@example.com" /></div>
              <div><Label>Website</Label><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" /></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div><Label>Min loan</Label><Input type="number" value={form.min_loan ?? ""} onChange={(e) => set("min_loan", e.target.value ? Number(e.target.value) : null)} /></div>
              <div><Label>Max loan</Label><Input type="number" value={form.max_loan ?? ""} onChange={(e) => set("max_loan", e.target.value ? Number(e.target.value) : null)} /></div>
              <div><Label>Rate min %</Label><Input type="number" value={form.interest_rate_min ?? ""} onChange={(e) => set("interest_rate_min", e.target.value ? Number(e.target.value) : null)} /></div>
              <div><Label>Rate max %</Label><Input type="number" value={form.interest_rate_max ?? ""} onChange={(e) => set("interest_rate_max", e.target.value ? Number(e.target.value) : null)} /></div>
            </div>

            <div>
              <Label>Required documents</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DOC_OPTIONS.map((doc) => {
                  const active = (form.required_documents ?? []).includes(doc);
                  return (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => toggleDoc(doc)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}
                    >
                      {doc}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => set("is_active", e.target.checked)} />
              Visible to users
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this institution?</DialogTitle>
            <DialogDescription>This permanently removes "{confirmDelete?.name}".</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && del(confirmDelete)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
