import { useRef, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicNav } from "@/components/PublicNav";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Check, Zap, Bot, Activity, Star, Layers, Eye, Headphones, ArrowDown, Timer, ShieldCheck } from "lucide-react";

// ─── Gradient text helper ────────────────────────────────────────────────────
const GradientText = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span
    className={className}
    style={{
      background: "linear-gradient(135deg, #00FF66 0%, #22D3EE 50%, #A855F7 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    }}
  >
    {children}
  </span>
);

// ─── Fade-up animation wrapper ────────────────────────────────────────────────
const FadeUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

// ─── Cinematic city skyline video background ──────────────────────────────────
function HeroVideo() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <video
        src="/hero-video.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80&auto=format&fit=crop"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform: "scale(1.05)",
          filter: "brightness(0.88) saturate(1.12)",
        }}
        onPlay={() => console.log("Hero video playing successfully")}
        onError={(e) => {
          const vid = e.target as HTMLVideoElement;
          console.warn("Hero video error:", vid.error?.code, vid.error?.message, vid.currentSrc);
        }}
      />

      {/* Dark overlay — 62% */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(7, 10, 15, 0.62)" }}
      />

      {/* Ambient green glow — bottom-left */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 14% 90%, rgba(0,255,102,0.09) 0%, transparent 52%)" }}
      />

      {/* Ambient purple glow — bottom-right */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 86% 90%, rgba(168,85,247,0.09) 0%, transparent 52%)" }}
      />

      {/* Bottom fade to page background */}
      <div
        className="absolute bottom-0 left-0 right-0 h-52"
        style={{ background: "linear-gradient(to top, #0B0F14 0%, transparent 100%)" }}
      />
    </div>
  );
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
      else setVal(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, active]);
  return val;
}

// ─── Stat counter card ────────────────────────────────────────────────────────
function StatCard({ value, unit, label, desc, color }: { value: number; unit: string; label: string; desc: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useCountUp(value, 1800, inView);
  return (
    <div ref={ref} className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,102,0.08)]">
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
        <span className="text-[10px] text-primary/60 font-medium">LIVE</span>
      </div>
      <p className="text-4xl font-bold mb-1" style={{ fontFamily: "Space Grotesk, sans-serif", color }}>
        {count}{unit}
      </p>
      <p className="font-semibold text-sm mb-1">{label}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

// ─── Testimonials data ────────────────────────────────────────────────────────
const testimonials = [
  { name: "Sarah Chen", role: "Founder, TaskFlow", rating: 5, text: "Gbolix automated our entire client onboarding. What took 3 hours now takes 5 minutes. Absolutely game-changing for our agency." },
  { name: "Marcus Williams", role: "CEO, BuildLaunch", rating: 5, text: "The FlutterFlow MVP they built was production-ready in 2 weeks. Clean code, great design, seamless delivery." },
  { name: "Aisha Okafor", role: "Marketing Dir., NovaBrands", rating: 5, text: "Our pitch deck completely transformed after working with Gbolix. Investors noticed immediately. We closed our seed round 3 weeks later." },
  { name: "James Adeyemi", role: "Indie Developer", rating: 5, text: "Google Play closed testing handled perfectly. The QA report was detailed and their turnaround was incredibly fast." },
  { name: "Elena Marcou", role: "Ops Lead, Scalepath", rating: 5, text: "The Make.com workflows they set up saved our team 15 hours per week. Professional, fast, and exactly what we needed." },
  { name: "Kofi Mensah", role: "Founder, GreenStack", rating: 5, text: "Three different services — automation, testing, and a landing page — all delivered on time. Gbolix is now our go-to operations partner." },
];

// ─── How It Works steps ────────────────────────────────────────────────────────
const steps = [
  { num: "01", title: "Request Your Project", desc: "Submit your request through our portal. Describe your needs in detail — we read everything.", icon: ArrowRight },
  { num: "02", title: "Receive A Quote", desc: "We review your project within 24 hours and send a clear, transparent pricing breakdown.", icon: Timer },
  { num: "03", title: "Build & Execute", desc: "Our team executes with regular updates. You track progress directly in your dashboard.", icon: Zap },
  { num: "04", title: "Deliver & Support", desc: "Your work is delivered with documentation. We stay available for follow-up support.", icon: ShieldCheck },
];

// ─── Why Gbolix features ───────────────────────────────────────────────────────
const features = [
  { icon: Layers,      title: "One Workspace",          desc: "Tasks, files, messages, and billing — all in one polished platform. No more scattered tools." },
  { icon: Star,        title: "Quality First",           desc: "Every deliverable meets premium standards. We don't ship until it's right." },
  { icon: Eye,         title: "Transparent Delivery",    desc: "Real-time status updates on every project. You always know where things stand." },
  { icon: Headphones,  title: "Reliable Support",        desc: "Dedicated response within hours, not days. We resolve issues fully — no ghosting." },
];

// ─── Services data ─────────────────────────────────────────────────────────────
const services = [
  { category: "Automation Setup",        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=480&q=80&auto=format&fit=crop", items: ["CRM Workflow Automation", "WhatsApp Automation", "Make.com Workflow", "API Integration"] },
  { category: "App Testing",             image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=480&q=80&auto=format&fit=crop", items: ["Google Play Closed Testing", "QA Report", "Android Ranking Audit"] },
  { category: "FlutterFlow / Bubble",    image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=480&q=80&auto=format&fit=crop", items: ["Landing Page", "Auth Setup", "Supabase Integration", "Admin Panel"] },
  { category: "Presentation Design",     image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=480&q=80&auto=format&fit=crop", items: ["Pitch Deck", "Company Profile", "Deck Redesign"] },
];

// ─── Products data ─────────────────────────────────────────────────────────────
const products = [
  { name: "Gbolix Prospect Finder", tagline: "AI-Powered Prospecting",          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80&auto=format&fit=crop" },
  { name: "Gbolix Monitor",         tagline: "Real-Time Website Monitoring",    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80&auto=format&fit=crop" },
  { name: "Gbolix AI Agent",        tagline: "Automated Conversations & Booking", image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80&auto=format&fit=crop" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [waitlisted, setWaitlisted] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <PublicNav />

      {/* ═══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0B0F14]">
        <HeroVideo />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-6 bg-primary/12 text-primary border-primary/25 hover:bg-primary/12 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-widest">
              Premium B2B Operations
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl md:text-8xl font-bold text-white mb-6 leading-[1.05] tracking-tight"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Build. Automate.<br />
            <GradientText>Scale.</GradientText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Helping founders and businesses automate operations, launch products faster, and scale efficiently — all from one platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/services">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/8 hover:border-white/40 gap-2 px-8 backdrop-blur-sm transition-all duration-300 group"
              >
                Explore Services
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                className="gap-2 px-8 font-semibold transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #00FF66 0%, #22D3EE 60%, #A855F7 100%)",
                  backgroundSize: "200% 200%",
                  color: "#0B0F14",
                  boxShadow: "0 0 32px rgba(0,255,102,0.4), 0 0 80px rgba(0,255,102,0.15)",
                  animation: "gradient-glow 4s ease infinite",
                }}
              >
                View Pricing
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-50">
          <ArrowDown size={18} className="text-white" style={{ animation: "scroll-bounce 2s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ═══ HOW GBOLIX WORKS ══════════════════════════════════════════════════ */}
      <section className="py-28 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">How It Works</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              How <GradientText>Gbolix</GradientText> Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A structured, transparent workflow from first request to final delivery.
            </p>
          </FadeUp>

          <div className="relative grid md:grid-cols-4 gap-6">
            {/* Connector line on desktop */}
            <div className="hidden md:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary/20 via-[#22D3EE]/30 to-[#A855F7]/20 z-0" />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <FadeUp key={step.num} delay={i * 0.1}>
                  <div className="bg-card border border-border rounded-2xl p-6 relative z-10 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_24px_rgba(0,255,102,0.08)] hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 mx-auto"
                      style={{ background: "linear-gradient(135deg, rgba(0,255,102,0.15), rgba(34,211,238,0.1))", border: "1px solid rgba(0,255,102,0.2)" }}>
                      <Icon size={20} className="text-primary" />
                    </div>
                    <p className="text-3xl font-bold mb-2 text-center" style={{ fontFamily: "Space Grotesk, sans-serif", background: "linear-gradient(135deg, #00FF66, #22D3EE)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{step.num}</p>
                    <h3 className="font-semibold text-center mb-2 text-sm" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{step.title}</h3>
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">{step.desc}</p>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ SERVICES ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <FadeUp className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Services</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Services That <GradientText>Scale With You</GradientText>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From automation to full MVPs — we handle the technical work so you can focus on growth.
            </p>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((s, i) => (
              <FadeUp key={s.category} delay={i * 0.08}>
                <div className="bg-background border border-border rounded-2xl overflow-hidden hover:border-primary/35 transition-all duration-300 hover:shadow-[0_0_28px_rgba(0,255,102,0.09)] hover:-translate-y-1 group">
                  <div className="h-36 overflow-hidden relative">
                    <img src={s.image} alt={s.category} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">{s.category}</p>
                    <ul className="space-y-1.5">
                      {s.items.map(item => (
                        <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check size={11} className="text-primary shrink-0 mt-0.5" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp className="text-center mt-10">
            <Link href="/services">
              <Button variant="outline" className="gap-2 hover:border-primary/50 hover:text-primary transition-all duration-300">
                View All Services <ArrowRight size={14} />
              </Button>
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* ═══ WHY GBOLIX ════════════════════════════════════════════════════════ */}
      <section className="py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">Why Gbolix</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              It's business without the <GradientText>bottlenecks.</GradientText>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Gbolix replaces fragmented tools, unreliable freelancers, and slow processes with one streamlined operations platform.
            </p>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeUp key={f.title} delay={i * 0.09}>
                  <div className="bg-card border border-border rounded-2xl p-6 hover:border-secondary/35 transition-all duration-300 hover:shadow-[0_0_28px_rgba(168,85,247,0.1)] hover:-translate-y-1 group text-center">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/15 transition-colors">
                      <Icon size={20} className="text-secondary" />
                    </div>
                    <h3 className="font-semibold mb-2 text-sm" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS CAROUSEL ══════════════════════════════════════════════ */}
      <section className="py-24 bg-card border-y border-border overflow-hidden">
        <FadeUp className="text-center mb-12 px-4">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Client Results</Badge>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Trusted by founders <GradientText>& agencies</GradientText>
          </h2>
        </FadeUp>

        <div className="relative">
          <div
            className="flex gap-5"
            style={{ animation: "marquee-scroll 38s linear infinite", width: "max-content" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "paused")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "running")}
          >
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={i} className="w-72 shrink-0 bg-background/80 backdrop-blur-sm border border-border rounded-2xl p-5 hover:border-primary/25 transition-colors">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} size={11} className="fill-[#FFB800] text-[#FFB800]" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-xs font-semibold">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DIGITAL OPERATIONS STUDIO ══════════════════════════════════════════ */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-secondary/4 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <FadeUp className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Operations Studio</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              The Digital <GradientText>Operations Studio</GradientText>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Numbers that speak to our commitment to precision, speed, and results.
            </p>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <FadeUp delay={0}><StatCard value={99} unit="%" label="Precision" desc="Project accuracy rate" color="#00FF66" /></FadeUp>
            <FadeUp delay={0.1}><StatCard value={48} unit="hr" label="Speed" desc="Average delivery time" color="#22D3EE" /></FadeUp>
            <FadeUp delay={0.2}><StatCard value={98} unit="%" label="Reliability" desc="On-time delivery rate" color="#A855F7" /></FadeUp>
            <FadeUp delay={0.3}><StatCard value={500} unit="+" label="Execution" desc="Projects completed" color="#00FF66" /></FadeUp>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCTS ════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">Coming Soon</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Gbolix <GradientText>Products</GradientText>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful tools built for the modern business. Join the waitlist to be first in line.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {products.map((p, i) => (
              <FadeUp key={p.name} delay={i * 0.1}>
                <div className="bg-background border border-border rounded-2xl overflow-hidden hover:border-secondary/30 transition-all duration-300 hover:shadow-[0_0_28px_rgba(168,85,247,0.08)] hover:-translate-y-1 group" style={{ animation: `card-float ${5 + i * 1.2}s ease-in-out infinite` }}>
                  <div className="h-44 overflow-hidden relative">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/40 to-transparent" />
                    <Badge className="absolute top-3 right-3 text-[10px] backdrop-blur-sm border-0" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.3),rgba(34,211,238,0.2))", color: "white" }}>
                      Coming Soon
                    </Badge>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider mb-1">{p.tagline}</p>
                    <h3 className="font-bold text-sm mb-3" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{p.name}</h3>
                    {waitlisted === p.name ? (
                      <div className="flex items-center gap-2 text-primary text-xs font-semibold">
                        <Check size={13} /> You're on the waitlist!
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs hover:border-secondary/50 hover:text-secondary transition-all"
                        onClick={() => setWaitlisted(p.name)}
                      >
                        Join Waitlist
                      </Button>
                    )}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ══════════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/8 blur-[120px] rounded-full" />
        </div>
        <FadeUp className="max-w-2xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Ready to <GradientText>scale your business?</GradientText>
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join founders, agencies, and businesses already using Gbolix.
          </p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="gap-2 px-10 font-semibold transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #00FF66, #22D3EE, #A855F7)",
                color: "#0B0F14",
                boxShadow: "0 0 32px rgba(0,255,102,0.35), 0 0 80px rgba(0,255,102,0.12)",
              }}
            >
              Get Started Free <ArrowRight size={16} />
            </Button>
          </Link>
        </FadeUp>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <img src="/logo-dark.png" alt="Gbolix" className="h-8 w-auto object-contain mb-3" />
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                Premium B2B operations automation. We help businesses build, automate, and scale.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3">Platform</p>
              <div className="space-y-2">
                {[["Services", "/services"], ["Products", "/products"], ["Pricing", "/pricing"]].map(([l, h]) => (
                  <Link key={l} href={h} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3">Company</p>
              <div className="space-y-2">
                {[["About", "/about"], ["Contact", "/contact"]].map(([l, h]) => (
                  <Link key={l} href={h} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3">Account</p>
              <div className="space-y-2">
                {[["Sign In", "/sign-in"], ["Create Account", "/sign-up"], ["Dashboard", "/dashboard"]].map(([l, h]) => (
                  <Link key={l} href={h} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Gbolix by Alex Gbolahan. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Build. Automate. <GradientText>Scale.</GradientText></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
