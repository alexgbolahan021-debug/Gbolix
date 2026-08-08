import { useLocation } from "wouter";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, FlaskConical, LayoutDashboard, Presentation } from "lucide-react";

const categories = [
  { key: "automation", title: "Automation Setup", description: "Automate repetitive business workflows, CRM processes, WhatsApp, email, Make.com, and integrations.", icon: Bot, available: true, href: "/new-request/automation" },
  { key: "app-testing", title: "App Testing", description: "Professional Google Play closed testing, QA reviews, and Android app ranking audits.", icon: FlaskConical, available: true, href: "/new-request/app-testing" },
  { key: "flutterflow", title: "FlutterFlow / Bubble MVP", description: "Build and launch your next app or MVP with FlutterFlow or Bubble.", icon: LayoutDashboard, available: true, href: "/new-request/flutterflow" },
  { key: "presentation", title: "Presentation Design", description: "Professional pitch decks, company profiles, and presentation redesigns.", icon: Presentation, available: true, href: "/new-request/presentation" },
];

export default function NewRequest() {
  const [, setLocation] = useLocation();
  return <ClientLayout><div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
    <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-wider text-primary">New Request</p><h1 className="text-2xl md:text-3xl font-bold mt-1">What can we help you with?</h1><p className="text-sm text-muted-foreground mt-2 max-w-2xl">Choose a service category to get started. We'll guide you through a short set of questions tailored to your project.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      {categories.map(({key,title,description,icon:Icon,available,href}) => <button key={key} type="button" disabled={!available} onClick={()=>available&&setLocation(href)} className={`group relative text-left rounded-2xl border p-5 md:p-6 transition-all ${available?"border-border bg-card hover:border-primary/60 hover:bg-primary/[0.03] cursor-pointer":"border-border/60 bg-muted/20 opacity-60 cursor-not-allowed"}`}>
        {!available&&<span className="absolute right-4 top-4 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Coming Soon</span>}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${available?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"}`}><Icon size={21}/></div>
        <h2 className="font-semibold text-lg pr-20">{title}</h2><p className="text-sm text-muted-foreground leading-6 mt-2 min-h-[72px]">{description}</p>
        {available&&<div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">View services <ArrowRight size={15} className="transition-transform group-hover:translate-x-1"/></div>}
      </button>)}
    </div>
    <div className="mt-6"><Button variant="outline" onClick={()=>setLocation("/dashboard")} className="w-full sm:w-auto">Back to Dashboard</Button></div>
  </div></ClientLayout>;
}
