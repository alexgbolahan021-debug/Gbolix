import { useRef, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicNav } from "@/components/PublicNav";
import { motion, useInView, useScroll } from "framer-motion";
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
const testimonialsRow1 = [
  { name: "Sarah Chen", role: "Founder, TaskFlow", rating: 5, text: "Gbolix automated our entire client onboarding. What took 3 hours now takes 5 minutes. Absolutely game-changing for our agency." },
  { name: "Marcus Williams", role: "CEO, BuildLaunch", rating: 5, text: "The FlutterFlow MVP they built was production-ready in 2 weeks. Clean code, great design, and seamless delivery." },
  { name: "Aisha Okafor", role: "Marketing Dir., NovaBrands", rating: 5, text: "Our pitch deck completely transformed. Investors noticed immediately. We closed our seed round 3 weeks later." },
  { name: "James Adeyemi", role: "Indie Developer", rating: 5, text: "Google Play closed testing handled perfectly. The QA report was detailed and their turnaround was incredibly fast." },
  { name: "Elena Marcou", role: "Ops Lead, Scalepath", rating: 5, text: "The Make.com workflows saved our team 15 hours per week. Professional, fast, and exactly what we needed." },
  { name: "Kofi Mensah", role: "Founder, GreenStack", rating: 5, text: "Three services delivered on time: automation, testing, and a landing page. Gbolix is our go-to operations partner." },
];

const testimonialsRow2 = [
  { name: "Priya Singh", role: "CEO, FlowBridge", rating: 5, text: "Switched from three different freelancers to Gbolix and never looked back. One platform, one team, zero chaos." },
  { name: "David Okonkwo", role: "CTO, Nexhub", rating: 5, text: "The Supabase integration was flawless. Backend setup in days, not weeks. Our launch came in ahead of schedule." },
  { name: "Yuki Tanaka", role: "Design Lead, PixelMint", rating: 5, text: "Company profile redesign was stunning. Better than agencies charging three times the price." },
  { name: "Andre Beaumont", role: "Founder, LaunchBase", rating: 5, text: "API integration work was clean, well-documented, and delivered early. Zero bugs in production." },
  { name: "Fatima Hassan", role: "Ops Manager, ClearPath", rating: 5, text: "The portal makes tracking projects effortless. Real-time status updates are a genuine game changer." },
  { name: "Carlos Rivera", role: "CMO, VentureMark", rating: 5, text: "WhatsApp automation for our sales team was transformative. Lead response time dropped from hours to seconds." },
];

// ─── Testimonial card ─────────────────────────────────────────────────────────
function TestimonialCard({ t }: { t: { name: string; role: string; rating: number; text: string } }) {
  return (
    <div className="w-72 shrink-0 bg-background/80 backdrop-blur-sm border border-border rounded-2xl p-5 hover:border-primary/25 transition-colors">
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
  );
}

// ─── How It Works steps (interactive) ────────────────────────────────────────
const howSteps = [
  {
    num: "01", title: "Submit Your Request", icon: ArrowRight, color: "#00FF66",
    desc: "Tell us exactly what you need through our structured portal.",
    subSteps: ["Choose a service from the catalog", "Describe your goals in detail", "Upload any reference files", "Submit — we take it from there"],
  },
  {
    num: "02", title: "Receive a Quote", icon: Timer, color: "#22D3EE",
    desc: "Within 24 hours, you get a clear scope, timeline, and pricing.",
    subSteps: ["Full project review by our team", "Scope and deliverables confirmed", "Clear timeline estimate", "Approve to begin execution"],
  },
  {
    num: "03", title: "Build & Execute", icon: Zap, color: "#A855F7",
    desc: "We execute your project with real-time updates in your dashboard.",
    subSteps: ["Development and execution begins", "Live status in your dashboard", "Direct messaging with our team", "Collaborative file sharing"],
  },
  {
    num: "04", title: "Deliver & Support", icon: ShieldCheck, color: "#00FF66",
    desc: "Final delivery with documentation. We stay on for follow-up support.",
    subSteps: ["Deliverable lands in your portal", "Review and feedback round", "Revisions as per agreement", "Ongoing support available"],
  },
];

// ─── How It Works interactive section ────────────────────────────────────────
function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 70%", "end 30%"],
  });
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    return scrollYProgress.on("change", v => {
      setActiveStep(Math.min(3, Math.floor(v * 4)));
    });
  }, [scrollYProgress]);

  const progressWidth = `${(activeStep / 3) * 75}%`;

  return (
    <section ref={sectionRef} className="py-28 px-4 relative">
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

        {/* ── Desktop: horizontal 4-col layout ── */}
        <div className="hidden md:block">
          <div className="relative mb-2">
            <div className="absolute top-[26px] left-[12.5%] right-[12.5%] h-px bg-border/50" />
            <motion.div
              className="absolute top-[26px] left-[12.5%] h-px"
              style={{ background: "linear-gradient(90deg, #00FF66, #22D3EE, #A855F7)" }}
              animate={{ width: progressWidth }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          </div>
          <div className="grid grid-cols-4 gap-5 mt-6">
            {howSteps.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === activeStep;
              const isPast = i < activeStep;
              return (
                <motion.div
                  key={step.num}
                  animate={{ opacity: isActive ? 1 : isPast ? 0.55 : 0.28, y: isActive ? -5 : 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className={`rounded-2xl p-6 border ${
                    isActive
                      ? "bg-card border-primary/40 shadow-[0_0_40px_rgba(0,255,102,0.1)]"
                      : "bg-card/40 border-border/50"
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto"
                    style={{
                      background: isActive ? `${step.color}18` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isActive ? step.color + "35" : "rgba(255,255,255,0.07)"}`,
                    }}
                  >
                    <Icon size={20} style={{ color: isActive ? step.color : "#444" }} />
                  </div>
                  <p
                    className="text-2xl font-bold text-center mb-2"
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      ...(isActive
                        ? { background: `linear-gradient(135deg, ${step.color}, #22D3EE)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
                        : { color: "#3a3a3a" }),
                    }}
                  >
                    {step.num}
                  </p>
                  <h3 className="font-semibold text-center text-sm mb-2" style={{ fontFamily: "Space Grotesk, sans-serif", color: isActive ? "#fff" : "#555" }}>
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-center leading-relaxed mb-4" style={{ color: isActive ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)" }}>
                    {step.desc}
                  </p>
                  <motion.ul
                    animate={{ opacity: isActive ? 1 : 0, maxHeight: isActive ? 160 : 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="overflow-hidden space-y-1.5"
                  >
                    {step.subSteps.map(sub => (
                      <li key={sub} className="flex items-start gap-1.5 text-[10px]">
                        <span className="shrink-0 mt-px" style={{ color: step.color }}>✓</span>
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>{sub}</span>
                      </li>
                    ))}
                  </motion.ul>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Mobile: vertical timeline ── */}
        <div className="md:hidden space-y-0">
          {howSteps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeStep;
            const isPast = i < activeStep;
            return (
              <motion.div
                key={step.num}
                className="flex gap-4"
                animate={{ opacity: isActive ? 1 : isPast ? 0.55 : 0.28 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 z-10"
                    style={{
                      borderColor: isActive ? step.color : "#333",
                      background: isActive ? `${step.color}18` : "#111",
                    }}
                  >
                    <Icon size={14} style={{ color: isActive ? step.color : "#555" }} />
                  </div>
                  {i < howSteps.length - 1 && (
                    <div className="w-px flex-1 mt-1 mb-1" style={{ background: isPast ? `${step.color}50` : "#2a2a2a" }} />
                  )}
                </div>
                <div className={`flex-1 pb-5 rounded-xl p-4 border mb-0 ${isActive ? "border-primary/30 bg-card" : "border-border/30 bg-card/20"}`} style={{ marginBottom: i < howSteps.length - 1 ? "8px" : 0 }}>
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: step.color }}>{step.num}</p>
                  <h3 className="font-semibold text-sm mb-1" style={{ fontFamily: "Space Grotesk, sans-serif", color: isActive ? "#fff" : "#777" }}>
                    {step.title}
                  </h3>
                  <p className="text-[11px] leading-relaxed" style={{ color: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}>
                    {step.desc}
                  </p>
                  {isActive && (
                    <ul className="mt-3 space-y-1.5">
                      {step.subSteps.map(sub => (
                        <li key={sub} className="flex items-start gap-1.5 text-[10px]">
                          <span className="shrink-0" style={{ color: step.color }}>✓</span>
                          <span style={{ color: "rgba(255,255,255,0.45)" }}>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
  { name: "Gbolix Leads",            tagline: "Verified Lead Intelligence",     image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80&auto=format&fit=crop", href: "/dashboard/products/gbolix-leads" },
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
            <Badge className="mb-6 bg-primary/12 text-primary border-primary/25 hover:bg-primary/12 backdrop-blur-sm px-4 py-1.5 text-xs uppercase tracking-widest gap-2 inline-flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" style={{ animation: "live-pulse 2.5s ease-in-out infinite" }} />
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
            Helping founders and businesses automate operations, launch products faster, and scale efficiently. All from one platform.
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
      <HowItWorksSection />

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

        {/* Row 1: right to left */}
        <div className="mb-5">
          <div
            className="flex gap-5"
            style={{ animation: "marquee-scroll 35s linear infinite", width: "max-content" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "paused")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "running")}
          >
            {[...testimonialsRow1, ...testimonialsRow1].map((t, i) => (
              <TestimonialCard key={i} t={t} />
            ))}
          </div>
        </div>

        {/* Row 2: left to right (reverse) */}
        <div>
          <div
            className="flex gap-5"
            style={{ animation: "marquee-scroll 50s linear infinite", animationDirection: "reverse", width: "max-content" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "paused")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "running")}
          >
            {[...testimonialsRow2, ...testimonialsRow2].map((t, i) => (
              <TestimonialCard key={i} t={t} />
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
            <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">Gbolix Products</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Gbolix <GradientText>Products</GradientText>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              One wallet powers the Gbolix toolset. Open Gbolix Leads from your account today; more tools are on the way.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {products.map((p, i) => (
              <FadeUp key={p.name} delay={i * 0.1}>
                <div className="bg-background border border-border rounded-2xl overflow-hidden hover:border-secondary/30 transition-all duration-300 hover:shadow-[0_0_28px_rgba(168,85,247,0.08)] hover:-translate-y-1 group" style={{ animation: `card-float ${5 + i * 1.2}s ease-in-out infinite` }}>
                  <div className="h-44 overflow-hidden relative">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/40 to-transparent" />
                    <Badge className="absolute top-3 right-3 text-[10px] backdrop-blur-sm border-0" style={{ background: p.href ? "rgba(0,255,102,0.86)" : "linear-gradient(135deg,rgba(168,85,247,0.3),rgba(34,211,238,0.2))", color: p.href ? "#0B0F14" : "white" }}>
                      {p.href ? "Account Access" : "Coming Soon"}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider mb-1">{p.tagline}</p>
                    <h3 className="font-bold text-sm mb-3" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{p.name}</h3>
                    {p.href ? <Link href={p.href}><Button size="sm" className="w-full text-xs bg-primary text-primary-foreground hover:bg-primary/90">Open Gbolix Leads</Button></Link> : waitlisted === p.name ? (
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
