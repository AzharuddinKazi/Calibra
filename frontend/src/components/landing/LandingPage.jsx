import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, FileText, Zap, Lock } from "lucide-react";

const USE_CASES = [
  {
    emoji: "🔍",
    title: "Fraud Detection Training",
    description:
      "Generate labelled transaction datasets with configurable fraud rates, typologies, and realistic spending patterns for supervised model training.",
    tags: ["Card-not-present", "Account takeover", "Synthetic identity"],
  },
  {
    emoji: "🏦",
    title: "AML Transaction Monitoring",
    description:
      "Produce structuring, fan-out, and circular-flow patterns at precise prevalences — matched to your jurisdiction's typology definitions.",
    tags: ["Structuring", "Fan-out", "Circular flow"],
  },
  {
    emoji: "📊",
    title: "Model Validation & Stress Testing",
    description:
      "Create edge-case datasets with constrained distributions to stress-test model boundaries and validate decision thresholds under adversarial conditions.",
    tags: ["Boundary cases", "Distribution shifts", "Threshold testing"],
  },
  {
    emoji: "⚖️",
    title: "Regulatory Compliance Testing",
    description:
      "Every run produces a PDF audit trail documenting constraints applied, fidelity scores, and LLM assistance log — ready for MRM and regulatory review.",
    tags: ["MRM-ready", "Audit trail", "Reproducible"],
  },
  {
    emoji: "🛡️",
    title: "Red Team Datasets",
    description:
      "Synthesise adversarial transaction patterns to evaluate model robustness and identify vulnerabilities before production deployment.",
    tags: ["Adversarial", "Robustness", "Gap analysis"],
  },
  {
    emoji: "📈",
    title: "Data Augmentation",
    description:
      "Supplement limited real-world fraud samples with statistically faithful synthetic records — no privacy risk, no regulatory overhead.",
    tags: ["Privacy-safe", "Statistical fidelity", "Scalable"],
  },
];

const STEPS = [
  {
    n: "01",
    title: "Describe your dataset",
    description:
      "Tell the AI agent what kind of data you need. It asks focused questions about domain, fraud typologies, prevalence rates, and column schema — one step at a time.",
  },
  {
    n: "02",
    title: "Configure columns",
    description:
      "Fine-tune per-column distributions with plain English instructions. The agent interprets them into statistical parameters automatically.",
  },
  {
    n: "03",
    title: "Generate & download",
    description:
      "Receive a synthetic CSV and a signed PDF audit report documenting every constraint applied, fidelity score, and configuration decision.",
  },
];

const TRUST = [
  { icon: Lock, label: "Privacy-preserving", sub: "No real customer data" },
  { icon: Shield, label: "Constraint-enforced", sub: "Domain rules built in" },
  { icon: Zap, label: "Statistically faithful", sub: "JS divergence validated" },
  { icon: FileText, label: "Audit-ready", sub: "PDF report on every run" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md"
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary text-lg leading-none drop-shadow-[0_0_12px_hsl(235_80%_65%/0.6)]">◆</span>
            <span className="font-semibold text-sm tracking-tight">Calibra</span>
          </div>
          <Button onClick={onStart} size="sm" className="gap-1.5 text-xs">
            Start Generating <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-32 pb-28 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Gradient orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 flex items-start justify-center"
          aria-hidden
        >
          <div className="w-[700px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(235_80%_65%/0.18),transparent_70%)] blur-3xl mt-10" />
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 max-w-3xl space-y-6"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Financial crime · Fraud · AML
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
          >
            Synthetic data for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-violet-400">
              financial crime
            </span>{" "}
            models
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Domain-accurate, constraint-enforced synthetic datasets for fraud detection
            and AML transaction monitoring — with a full audit report on every run.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              onClick={onStart}
              size="lg"
              className="gap-2 px-8 text-sm font-medium shadow-[0_0_24px_hsl(235_80%_65%/0.3)]"
            >
              Start with AI Agent
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 text-sm font-medium border-border/60"
              onClick={() => document.getElementById("use-cases")?.scrollIntoView({ behavior: "smooth" })}
            >
              View use cases
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Trust bar */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="border-y border-border/50 bg-card/30"
      >
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Use cases */}
      <section id="use-cases" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14 space-y-3"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">Use cases</p>
            <h2 className="text-3xl font-bold tracking-tight">
              Built for every stage of the ML lifecycle
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
              From initial model training to regulatory sign-off, Calibra covers the full
              synthetic data lifecycle for financial crime teams.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {USE_CASES.map((uc) => (
              <motion.div
                key={uc.title}
                variants={fadeUp}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="group rounded-xl border border-border bg-card p-6 space-y-4 cursor-default hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(235_80%_65%/0.1),0_8px_32px_hsl(0_0%_0%/0.2)] transition-shadow duration-200"
              >
                <span className="text-2xl">{uc.emoji}</span>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-foreground leading-tight">{uc.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{uc.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {uc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium text-muted-foreground bg-muted/50 border border-border/60 rounded-full px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-card/20 border-y border-border/50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14 space-y-3"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight">
              From intent to dataset in three steps
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="space-y-4"
          >
            {STEPS.map((step) => (
              <motion.div
                key={step.n}
                variants={fadeUp}
                className="flex gap-6 p-6 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors duration-200"
              >
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm font-mono">{step.n}</span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center space-y-6"
        >
          <div className="inline-block">
            <span className="text-primary text-4xl leading-none drop-shadow-[0_0_24px_hsl(235_80%_65%/0.7)]">◆</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to generate your dataset?
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The AI agent takes you from zero to a configured schema in minutes. No forms to
            fill — just a conversation.
          </p>
          <Button
            onClick={onStart}
            size="lg"
            className="gap-2 px-10 text-sm font-medium shadow-[0_0_32px_hsl(235_80%_65%/0.35)]"
          >
            Start with AI Agent
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary text-sm leading-none">◆</span>
            <span className="text-xs text-muted-foreground">Calibra — Synthetic Data Engine</span>
          </div>
          <p className="text-xs text-muted-foreground/50">Financial crime · Fraud · AML</p>
        </div>
      </footer>
    </div>
  );
}
