import { useState } from "react";
import { PublicNav } from "@/components/PublicNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Twitter, Linkedin, MessageSquare, Send, CheckCircle2, Globe } from "lucide-react";

const FadeUp = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <div className="pt-28 pb-16 px-4 text-center border-b border-border">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Get In Touch</Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-5" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          Contact Gbolix
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Have a project in mind? Want to learn more about our services? We respond within 24 hours.
        </p>
      </div>

      <div className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12">

          {/* Left — info */}
          <FadeUp>
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "Space Grotesk, sans-serif" }}>How can we help?</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Whether you're looking to automate your operations, launch a product, test your app, or design a compelling presentation — our team is ready to help. Reach out with any questions about services, pricing, or timelines.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Mail size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">hello@gbolix.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Globe size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Response Time</p>
                    <p className="text-sm font-medium">Within 24 hours</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4">Follow Gbolix</p>
                <div className="flex gap-3">
                  {[
                    { icon: Twitter, label: "X / Twitter", href: "https://x.com/gbolix" },
                    { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/company/gbolix" },
                    { icon: MessageSquare, label: "Discord", href: "#" },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
                      >
                        <Icon size={14} /> {s.label}
                      </a>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gradient-to-br from-card to-primary/5 border border-border rounded-xl p-5">
                <p className="text-xs font-semibold mb-2">Quick tip</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  For the fastest response, create a free account and submit your request directly through the portal. Our team receives all project details in one place and can respond with a detailed quote faster.
                </p>
              </div>
            </div>
          </FadeUp>

          {/* Right — form */}
          <FadeUp delay={0.15}>
            {sent ? (
              <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px] gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Message Sent!</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <Button variant="outline" size="sm" onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                  Send Another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-7 space-y-5">
                <h2 className="text-lg font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Send us a message</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Your Name</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Alex Gbolahan"
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Email Address</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@company.com"
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Subject</label>
                  <input
                    required
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="I need help with..."
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us about your project, what you need, and any relevant details..."
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 font-semibold transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, #00FF66, #22D3EE)",
                    color: "#0B0F14",
                    boxShadow: "0 0 20px rgba(0,255,102,0.25)",
                  }}
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Sending...</>
                  ) : (
                    <><Send size={14} /> Send Message</>
                  )}
                </Button>
              </form>
            )}
          </FadeUp>
        </div>
      </div>
    </div>
  );
}
