import { PublicNav } from "@/components/PublicNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Bot, Activity, CheckCircle2 } from "lucide-react";

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

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Header */}
      <div className="pt-28 pb-16 px-4 text-center border-b border-border">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">About Gbolix</Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-5" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          The Digital Operations Studio
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
          Gbolix is a founder-led, premium B2B operations automation platform designed to help businesses build faster, automate smarter, and scale confidently.
        </p>
      </div>

      <div className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-20">

          {/* What is Gbolix */}
          <FadeUp>
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>What Is Gbolix?</h2>
              <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Gbolix is a premium B2B operations automation platform founded by Alex Gbolahan. We provide professional services that help startups, agencies, and growing businesses streamline their operations, automate repetitive workflows, and ship products faster — all from a single, transparent platform.
                </p>
                <p>
                  At its core, Gbolix believes that every founder deserves access to high-quality technical execution without the complexity of managing multiple vendors, freelancers, or tools. We bring everything into one place: service requests, project tracking, file delivery, and real-time communication.
                </p>
                <p>
                  Whether you need a CRM automation workflow built in Make.com, a full FlutterFlow or Bubble MVP launched in two weeks, your mobile app professionally tested on Google Play, or a pitch deck that converts — Gbolix has you covered with transparent pricing and a structured delivery process.
                </p>
              </div>
            </section>
          </FadeUp>

          {/* Who Is Gbolix For */}
          <FadeUp delay={0.1}>
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Who Is Gbolix For?</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
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
                  <div key={item} className="flex items-start gap-2 bg-card border border-border rounded-xl px-4 py-3">
                    <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </FadeUp>

          {/* Services */}
          <FadeUp delay={0.1}>
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>What Services Does Gbolix Provide?</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Gbolix offers four core service categories, each with transparent, fixed pricing:
              </p>
              <div className="space-y-4">
                {[
                  {
                    title: "Automation Setup",
                    desc: "We design and build automation workflows using tools like Make.com, Zapier, and custom API integrations. Services include CRM automation, WhatsApp automation, email drip sequences, and webhook integrations. Starting from $49.",
                  },
                  {
                    title: "App Testing",
                    desc: "Professional mobile app testing services including Google Play closed testing coordination (14 days), detailed QA reports, and Android app ranking audits. Essential for any mobile app before a public launch.",
                  },
                  {
                    title: "FlutterFlow / Bubble MVP",
                    desc: "Full no-code and low-code MVP development using FlutterFlow and Bubble. We handle landing pages, authentication setup, Supabase database integration, admin panels, and client portals — delivering production-ready applications.",
                  },
                  {
                    title: "Presentation Design",
                    desc: "Professional pitch decks, company profiles, and slide redesigns that communicate your vision clearly. Used by founders raising funds, agencies winning clients, and businesses presenting to stakeholders.",
                  },
                ].map(s => (
                  <div key={s.title} className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-semibold mb-2 text-sm" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </FadeUp>

          {/* Products */}
          <FadeUp delay={0.1}>
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>What Products Is Gbolix Building?</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                In addition to our professional services, Gbolix is actively developing three proprietary software products designed to automate key business functions:
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Activity, name: "Gbolix Prospect Finder", desc: "AI-powered B2B prospect generation with verified contact data." },
                  { icon: Zap, name: "Gbolix Monitor", desc: "Real-time website and webhook uptime monitoring with instant alerts." },
                  { icon: Bot, name: "Gbolix AI Agent", desc: "Automated conversation and booking management for 24/7 customer engagement." },
                ].map(p => {
                  const Icon = p.icon;
                  return (
                    <div key={p.name} className="bg-card border border-border rounded-xl p-5 text-center">
                      <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Icon size={18} className="text-secondary" />
                      </div>
                      <p className="font-semibold text-xs mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                      <Badge className="mt-3 bg-muted text-muted-foreground border-0 text-[10px]">Coming Soon</Badge>
                    </div>
                  );
                })}
              </div>
            </section>
          </FadeUp>

          {/* Mission + Why */}
          <FadeUp delay={0.1}>
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Why Choose Gbolix?</h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Gbolix was built out of frustration with the fragmented, unreliable, and opaque way most businesses get technical work done. Hiring freelancers means managing timelines, quality, and communication across multiple people. Using different tools means your data, files, and conversations are scattered everywhere.
                </p>
                <p>
                  Gbolix solves this with one workspace: you submit a request, track its progress in real time, communicate directly with our team, and download your deliverables — all in one polished platform. Every project has transparent pricing, clear timelines, and documented delivery.
                </p>
                <p>
                  Our founder-led approach means Alex Gbolahan is personally invested in the quality and reputation of every project. We don't outsource quality control. We don't ghost clients after delivery. We build long-term relationships with businesses that want a reliable operations partner.
                </p>
                <p>
                  Gbolix serves clients in the United States, United Kingdom, Nigeria, Ghana, Canada, UAE, and globally through its online platform. Our pricing is competitive, our delivery is fast, and our support is responsive.
                </p>
              </div>
            </section>
          </FadeUp>

          {/* How It Works */}
          <FadeUp delay={0.1}>
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>How Does Gbolix Work?</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The Gbolix workflow is simple, structured, and transparent. After creating a free account, clients use our portal to submit service requests. Our team reviews each request within 24 hours and provides a clear quote. Once approved, we begin execution with regular progress updates visible directly in your dashboard. All files and deliverables are organized in your account, and project-scoped messaging keeps communication clear throughout.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                After delivery, we remain available for follow-up support and revisions as agreed. Most clients return for multiple services because the experience is reliable, professional, and produces real results.
              </p>
            </section>
          </FadeUp>

          {/* CTA */}
          <FadeUp delay={0.1}>
            <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-2xl p-10 text-center">
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Ready to work with us?</h3>
              <p className="text-muted-foreground mb-6">Create your account and submit your first request today.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link href="/sign-up">
                  <Button
                    className="gap-2 font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #00FF66, #22D3EE)",
                      color: "#0B0F14",
                      boxShadow: "0 0 20px rgba(0,255,102,0.3)",
                    }}
                  >
                    Create Free Account <ArrowRight size={14} />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="gap-2 hover:border-primary/50 hover:text-primary transition-all">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
          </FadeUp>

        </div>
      </div>
    </div>
  );
}
