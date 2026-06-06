import { useState } from "react";
import { toast } from "sonner";
import { Upload, X, CheckCircle2, MessageCircle, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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

type Uploaded = { doc: string; fileName: string; url: string };

export function ApplyDialog({
  mfi, userId, open, onClose,
}: { mfi: Microfin; userId: string; open: boolean; onClose: () => void }) {
  const [files, setFiles] = useState<Record<string, File>>({});
  const [uploaded, setUploaded] = useState<Uploaded[]>([]);
  const [applicantName, setApplicantName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const docs = mfi.required_documents.length > 0
    ? mfi.required_documents
    : ["Supporting Documents"];

  const pickFile = (doc: string, file: File | undefined) => {
    if (!file) return;
    setFiles((f) => ({ ...f, [doc]: file }));
  };

  const allSelected = docs.every((d) => files[d]);

  // Uploads all selected files to the private bucket and returns signed URLs.
  const uploadAll = async (): Promise<Uploaded[]> => {
    await supabase.auth.refreshSession().catch(() => undefined);
    const results: Uploaded[] = [];
    for (const doc of docs) {
      const file = files[doc];
      if (!file) continue;
      const safeDoc = doc.replace(/[^a-z0-9]/gi, "_");
      const ext = file.name.split(".").pop();
      const path = `${userId}/${mfi.id}/${safeDoc}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("loan-documents").upload(path, file, { upsert: true });
      if (error) throw new Error(`${doc}: ${error.message}`);
      // Signed URL valid for 7 days so the institution can download from WhatsApp/email
      const { data, error: signErr } = await supabase.storage
        .from("loan-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signErr || !data) throw new Error(`${doc}: could not create link`);
      results.push({ doc, fileName: file.name, url: data.signedUrl });
    }
    return results;
  };

  const buildMessage = (links: Uploaded[]) => {
    const lines = [
      `Loan application for ${mfi.name}`,
      applicantName ? `Applicant: ${applicantName}` : "",
      note ? `Note: ${note}` : "",
      "",
      "Documents:",
      ...links.map((l) => `• ${l.doc}: ${l.url}`),
    ].filter(Boolean);
    return lines.join("\n");
  };

  const ensureUploaded = async (): Promise<Uploaded[]> => {
    if (uploaded.length) return uploaded;
    const links = await uploadAll();
    setUploaded(links);
    return links;
  };

  const sendWhatsApp = async () => {
    if (!allSelected) return toast.error("Please attach all required documents first");
    const wa = (mfi.whatsapp ?? "").replace(/[^0-9]/g, "");
    if (!wa) return toast.error("This institution has no WhatsApp number");
    setBusy(true);
    try {
      const links = await ensureUploaded();
      const text = encodeURIComponent(buildMessage(links));
      window.open(`https://wa.me/${wa}?text=${text}`, "_blank");
      toast.success("Documents uploaded. Opening WhatsApp…");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const sendEmail = async () => {
    if (!allSelected) return toast.error("Please attach all required documents first");
    if (!mfi.email) return toast.error("This institution has no email address");
    setBusy(true);
    try {
      const links = await ensureUploaded();
      const subject = encodeURIComponent(`Loan application — ${applicantName || "New applicant"}`);
      const body = encodeURIComponent(buildMessage(links));
      window.location.href = `mailto:${mfi.email}?subject=${subject}&body=${body}`;
      toast.success("Documents uploaded. Opening email…");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply to {mfi.name}</DialogTitle>
          <DialogDescription>
            Attach the required documents, then send them via WhatsApp or email. Files are stored securely and shared as private download links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Your full name</Label>
            <Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="Jane Banda" />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Requesting ZMW 10,000 over 12 months" />
          </div>

          <div className="space-y-2">
            <Label>Required documents</Label>
            {docs.map((doc) => {
              const file = files[doc];
              return (
                <div key={doc} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    {file ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" /> : <Upload className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{doc}</div>
                      {file && <div className="truncate text-xs text-muted-foreground">{file.name}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent">
                      {file ? "Change" : "Attach"}
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => { pickFile(doc, e.target.files?.[0]); setUploaded([]); }}
                      />
                    </label>
                    {file && (
                      <Button size="icon" variant="ghost" onClick={() => { setFiles((f) => { const n = { ...f }; delete n[doc]; return n; }); setUploaded([]); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {mfi.whatsapp && (
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={sendWhatsApp} disabled={busy || !allSelected}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                Send via WhatsApp
              </Button>
            )}
            {mfi.email && (
              <Button variant="outline" className="flex-1" onClick={sendEmail} disabled={busy || !allSelected}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Send via Email
              </Button>
            )}
          </div>
          {!allSelected && (
            <p className="text-center text-xs text-muted-foreground">Attach all documents to enable sending.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
