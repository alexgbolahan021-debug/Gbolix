import { PublicNav } from "@/components/PublicNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Bot, Activity, CheckCircle2, Shield, Clock, Star } from "lucide-react";

const FadeUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

const GradientText = ({ children }: { children: React.ReactNode }) => (
  <span style={{ background: "linear-gradient(135deg, #00FF66 0%, #22D3EE 50%, #A855F7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
    {children}
  </span>
);

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* ── Header ── */}
      <div className="pt-28 pb-16 px-4 text-center border-b border-border">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">About Gbolix</Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-5" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          The Digital <GradientText>Operations Studio</GradientText>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
          A founder-led, premium B2B operations platform helping businesses build faster, automate smarter, and scale with confidence.
        </p>
      </div>

      {/* ── Hero Image Banner ── */}
      <div className="relative overflow-hidden" style={{ height: 360 }}>
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400&q=80&auto=format&fit=crop"
          alt="Team collaboration at Gbolix"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(11,15,20,0.3) 0%, rgba(11,15,20,0.7) 100%)" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <FadeUp>
            <p className="text-white text-2xl md:text-3xl font-bold text-center px-4 max-w-2xl leading-snug" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              "Built by a founder, for founders. One platform. Zero chaos."
            </p>
          </FadeUp>
        </div>
      </div>

      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto space-y-28">

          {/* ── What is Gbolix — image right ── */}
          <FadeUp>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-xs">Our Story</Badge>
                <h2 className="text-3xl font-bold mb-5" style={{ fontFamily: "Space Grotesk, sans-serif" }}>What Is Gbolix?</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                  <p>
                    Gbolix is a premium B2B operations automation platform founded by Alex Gbolahan. We provide professional services that help startups, agencies, and growing businesses streamline their operations, automate repetitive workflows, and ship products faster — all from one transparent platform.
                  </p>
                  <p>
                    At its core, Gbolix believes every founder deserves access to high-quality technical execution without managing multiple vendors, freelancers, or scattered tools. We bring everything into one place: service requests, project tracking, file delivery, and direct communication.
                  </p>
                  <p>
                    Whether you need a CRM automation workflow, a full FlutterFlow MVP, professional app testing, or a pitch deck that converts — Gbolix delivers with transparent pricing and a structured process every time.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-border shadow-2xl relative group">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&auto=format&fit=crop"
                  alt="Gbolix operations platform"
                  className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14]/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider">Operations Platform</p>
                  <p className="text-white text-sm font-bold">One workspace for everything</p>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* ── Who it's for ── */}
          <FadeUp delay={0.05}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="rounded-2xl overflow-hidden border border-border shadow-2xl relative group lg:order-1">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop"
                  alt="Founders who use Gbolix"
                  className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14]/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-xs text-[#22D3EE] font-semibold uppercase tracking-wider">Our Clients</p>
                  <p className="text-white text-sm font-bold">Founders, agencies, and builders</p>
                </div>
              </div>
              <div className="lg:order-2">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-xs">Who It's For</Badge>
                <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Who Is Gbolix For?</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                  Gbolix is built for modern business builders who need execution, not just advice. Our clients include:
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    "Startup founders launching their first product",
                    "Agency owners automating client delivery",
                    "Small businesses streamlining operations",
                    "Developers needing professional QA and testing",
                    "Marketing teams wanting better presentations",
                    "Entrepreneurs scaling with limited resources",
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/25 transition-all">
                      <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>

          {/* ── Services ── */}
          <FadeUp delay={0.05}>
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-xs">Services</Badge>
                <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>What Services Does Gbolix Provide?</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                  Four core service categories, each with transparent, fixed pricing and structured delivery:
                </p>
                <div className="space-y-3">
                  {[
                    { title: "Automation Setup", color: "#00FF66", desc: "CRM automation, WhatsApp flows, Make.com workflows, and API integrations. Starting from $49." },
                    { title: "App Testing", color: "#22D3EE", desc: "Google Play closed testing, detailed QA reports, and Android app ranking audits." },
                    { title: "FlutterFlow / Bubble MVP", color: "#A855F7", desc: "Full no-code and low-code MVP development with auth, Supabase, admin panels, and client portals." },
                    { title: "Presentation Design", color: "#00FF66", desc: "Pitch decks, company profiles, and slide redesigns that close deals and raise funds." },
                  ].map(s => (
                    <div key={s.title} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-4 hover:border-primary/20 transition-all group">
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: s.color }} />
                      <div>
                        <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{s.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-border shadow-2xl relative group">
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80&auto=format&fit=crop"
                  alt="Gbolix services"
                  className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14]/70 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-xs text-[#A855F7] font-semibold uppercase tracking-wider">4 Service Categories</p>
                  <p className="text-white text-sm font-bold">Transparent, fixed pricing</p>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* ── Why Gbolix ── full width with numbers ── */}
          <FadeUp delay={0.05}>
            <div className="bg-card border border-border rounded-3xl p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 blur-3xl rounded-full pointer-events-none" />
              <div className="relative z-10">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-xs">Why Gbolix</Badge>
                <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  Why Choose <GradientText>Gbolix?</GradientText>
                </h2>
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>
                      Gbolix was built out of frustration with fragmented, unreliable, and opaque technical work. Hiring freelancers means managing timelines and quality across multiple people. Using different tools scatters your data, files, and conversations everywhere.
                    </p>
                    <p>
                      Gbolix solves this with one workspace: submit a request, track progress in real time, communicate directly with our team, and download your deliverables. Every project has transparent pricing, clear timelines, and documented delivery.
                    </p>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed text-sm">
                    <p>
                      Our founder-led approach means Alex Gbolahan is personally invested in every project's quality. We don't outsource quality control. We don't ghost clients. We build long-term relationships with businesses that want a reliable operations partner.
                    </p>
                    <p>
                      Gbolix serves clients in the US, UK, Nigeria, Ghana, Canada, UAE, and globally. Our pricing is competitive, delivery is fast, and support is responsive.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Star, value: "99%", label: "Precision Rate", color: "#00FF66" },
                    { icon: Clock, value: "48hr", label: "Avg Delivery", color: "#22D3EE" },
                    { icon: Shield, value: "98%", label: "On-Time Rate", color: "#A855F7" },
                    { icon: Zap, value: "500+", label: "Projects Done", color: "#00FF66" },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="bg-background border border-border rounded-xl p-4 text-center hover:border-primary/20 transition-all">
                        <Icon size={18} className="mx-auto mb-2" style={{ color: s.color }} />
                        <p className="text-xl font-bold mb-0.5" style={{ fontFamily: "Space Grotesk, sans-serif", color: s.color }}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </FadeUp>

          {/* ── Products ── */}
          <FadeUp delay={0.05}>
            <div>
              <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20 text-xs">Coming Soon</Badge>
              <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>What Products Is Gbolix Building?</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed text-sm max-w-2xl">
                In addition to our professional services, Gbolix is actively developing three proprietary software products designed to automate key business functions:
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Activity, name: "Gbolix Prospect Finder", tagline: "AI-Powered Prospecting", desc: "AI-powered B2B prospect generation with verified contact data.", image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80&auto=format&fit=crop", color: "#00FF66" },
                  { icon: Zap, name: "Gbolix Monitor", tagline: "Real-Time Monitoring", desc: "Website and webhook uptime monitoring with instant alerts and status pages.", image: "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=600&q=80&auto=format&fit=crop", color: "#22D3EE" },
                  { icon: Bot, name: "Gbolix AI Agent", tagline: "Automated Conversations", desc: "Automated conversation and booking management for 24/7 customer engagement.", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80&auto=format&fit=crop", color: "#A855F7" },
                ].map(p => {
                  const Icon = p.icon;
                  return (
                    <div key={p.name} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-secondary/30 transition-all group hover:-translate-y-1 duration-300">
                      <div className="relative h-40 overflow-hidden">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14]/80 to-transparent" />
                        <Badge className="absolute top-3 right-3 text-[10px] backdrop-blur-sm border-0" style={{ background: "rgba(168,85,247,0.3)", color: "white" }}>Coming Soon</Badge>
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${p.color}18` }}>
                            <Icon size={14} style={{ color: p.color }} />
                          </div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: p.color }}>{p.tagline}</p>
                        </div>
                        <p className="font-bold text-sm mb-1.5" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{p.name}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeUp>

          {/* ── CTA ── */}
          <FadeUp delay={0.05}>
            <div className="relative rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200&q=80&auto=format&fit=crop"
                alt="Get started with Gbolix"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(11,15,20,0.92) 0%, rgba(11,15,20,0.85) 100%)" }} />
              <div className="relative z-10 px-8 md:px-12 py-14 text-center">
                <h3 className="text-3xl font-bold mb-3" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  Ready to work with <GradientText>Gbolix?</GradientText>
                </h3>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Create your free account and submit your first request today. Most projects get a quote within 24 hours.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link href="/sign-up">
                    <Button
                      className="gap-2 font-semibold px-8"
                      style={{
                        background: "linear-gradient(135deg, #00FF66, #22D3EE)",
                        color: "#0B0F14",
                        boxShadow: "0 0 28px rgba(0,255,102,0.35)",
                      }}
                    >
                      Create Free Account <ArrowRight size={14} />
                    </Button>
                  </Link>
                  <Link href="/services">
                    <Button variant="outline" className="gap-2 hover:border-primary/50 hover:text-primary transition-all px-8">
                      Browse Services <ArrowRight size={14} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </FadeUp>

        </div>
      </div>
    </div>
  );
}
