import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { ClientLayout } from "@/components/ClientLayout";
import { PublicNav } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Star, CheckCircle2, Clock3, ArrowLeft, Loader2 } from "lucide-react";

const initialForm = { name: "", email: "", comment: "" };
type FeedbackRecord = { id: number; senderName: string; senderEmail: string | null; rating: number; comment: string; source: string; status: string; createdAt: string };

function RatingPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">{[1, 2, 3, 4, 5].map(star => <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={`${star} star${star === 1 ? "" : "s"}`} onClick={() => onChange(star)} className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"><Star size={29} className={star <= value ? "fill-[#FFB800] text-[#FFB800]" : "text-muted-foreground/40"} /></button>)}</div>;
}

function FeedbackContent({ signedIn, user }: { signedIn: boolean; user?: { fullName: string | null; primaryEmailAddress?: { emailAddress: string } | null } }) {
  const [form, setForm] = useState(initialForm);
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<FeedbackRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(signedIn);

  useEffect(() => {
    if (!signedIn) return;
    customFetch<FeedbackRecord[]>("/api/feedback/mine", { responseType: "json" }).then(setHistory).catch(() => setHistory([])).finally(() => setHistoryLoading(false));
  }, [signedIn]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!rating) { setError("Please choose a star rating before submitting."); return; }
    setSaving(true);
    try {
      await customFetch<FeedbackRecord>(signedIn ? "/api/feedback" : "/api/feedback/public", { method: "POST", responseType: "json", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name.trim() || undefined, email: form.email.trim() || undefined, rating, comment: form.comment.trim(), pageUrl: window.location.pathname }) });
      setSent(true);
      if (signedIn) { const latest = await customFetch<FeedbackRecord[]>("/api/feedback/mine", { responseType: "json" }).catch(() => [] as FeedbackRecord[]); setHistory(latest); }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit feedback. Please try again.");
    } finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 md:px-8"><div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]"><section><Badge className="border-primary/20 bg-primary/10 text-primary"><MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />{signedIn ? "Workspace feedback" : "Help shape Gbolix"}</Badge><h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl" style={{ fontFamily: "Sora, sans-serif" }}>{signedIn ? "How are we doing?" : "Tell us what you think."}</h1><p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{signedIn ? "Share your experience with the Gbolix workspace, projects, support, or products. Your feedback helps our team improve." : "Leave a quick rating and comment about your experience with Gbolix. We read every response."}</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{[{ title: "Real people", text: "Your response goes to the Gbolix team." }, { title: "Five stars", text: "Rate the experience in one tap." }, { title: "Actionable", text: "Tell us what to improve next." }].map(item => <div key={item.title} className="rounded-xl border border-border bg-card p-4"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p></div>)}</div>{signedIn && <div className="mt-8"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-bold">Your previous feedback</h2><p className="text-xs text-muted-foreground">Only you can see this history.</p></div><Clock3 className="text-primary" size={18} /></div>{historyLoading ? <Loader2 className="animate-spin text-primary" size={18} /> : !history.length ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Your submitted feedback will appear here.</p> : <div className="space-y-3">{history.map(item => <div key={item.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><div className="flex gap-0.5">{Array.from({ length: item.rating }).map((_, index) => <Star key={index} size={13} className="fill-[#FFB800] text-[#FFB800]" />)}</div><span className="text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div><p className="mt-2 text-sm leading-6">{item.comment}</p><span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-primary">{item.status}</span></div>)}</div>}</div>}</section><section className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5 md:p-8">{sent ? <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><CheckCircle2 size={31} className="text-primary" /></div><h2 className="mt-5 text-2xl font-bold">Thank you for the feedback.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Your rating and comment have been sent to the Gbolix team. We appreciate you taking the time.</p><Button variant="outline" className="mt-6" onClick={() => { setSent(false); setForm(initialForm); setRating(0); }}>Send another response</Button></div> : <form onSubmit={submit} className="space-y-5"><div><h2 className="text-xl font-bold">Leave feedback</h2><p className="mt-1 text-sm text-muted-foreground">It takes less than a minute.</p></div>{!signedIn && <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-medium text-muted-foreground">Your name</label><input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Your name" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" /></div><div><label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email address</label><input required type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="you@company.com" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" /></div></div>}{signedIn && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">Submitting as <span className="font-semibold text-foreground">{user?.fullName || "your workspace account"}</span>. Your account identity will be attached automatically.</div>}<div><label className="mb-2 block text-xs font-medium text-muted-foreground">Your rating</label><RatingPicker value={rating} onChange={setRating} /><p className="mt-1 text-xs text-muted-foreground">{rating ? `${rating} out of 5 stars` : "Select a rating"}</p></div><div><label className="mb-1.5 block text-xs font-medium text-muted-foreground">What should we know?</label><textarea required minLength={3} maxLength={2000} rows={7} value={form.comment} onChange={event => setForm(current => ({ ...current, comment: event.target.value }))} placeholder="Tell us what went well or what we can improve..." className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" /></div>{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button type="submit" disabled={saving} className="w-full gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90">{saving ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <><MessageSquarePlus size={15} /> Send feedback</>}</Button><p className="text-center text-[11px] text-muted-foreground">By submitting, you agree that Gbolix may review this feedback internally.</p></form>}</section></div>{!signedIn && <div className="mt-8 flex justify-center"><Link href="/"><Button variant="ghost" className="gap-2 text-muted-foreground"><ArrowLeft size={14} /> Back to Gbolix home</Button></Link></div>}</main>;
}

export default function Feedback() {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;
  const content = <FeedbackContent signedIn={!!isSignedIn} user={user ? { fullName: user.fullName, primaryEmailAddress: user.primaryEmailAddress } : undefined} />;
  return isSignedIn ? <ClientLayout>{content}</ClientLayout> : <div className="min-h-screen bg-background"><PublicNav />{content}</div>;
}
