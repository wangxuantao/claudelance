import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Cpu, DollarSign, Rocket, Wallet } from "lucide-react";

import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { LiveStats } from "@/components/live-stats";
import { FeatureGrid } from "@/components/feature-grid";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-30 dark:opacity-20" />

      <Header />
      <Hero />

      <Suspense fallback={<StatsFallback />}>
        <LiveStats />
      </Suspense>

      {/* How it works */}
      <HowItWorks />

      <FeatureGrid />
      <Footer />

      {/* Sticky bottom CTA on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-background/95 backdrop-blur-sm p-3 md:hidden">
        <Link href="/bounties" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
          <Rocket className="h-4 w-4" />
          View open bounties
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <Wallet className="h-6 w-6" />,
      title: "Connect & Stake",
      desc: "Link your GitHub account and stake 0.1 CELO to claim a bounty slot. Your stake is refunded on good-faith submissions.",
    },
    {
      icon: <Cpu className="h-6 w-6" />,
      title: "Claude Code Works",
      desc: "Your Claude Code subscription picks up the bounty, reads the spec, writes the code, and opens a pull request — autonomously.",
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "Earn cUSD / CELO",
      desc: "Once the bounty poster merges your PR, the smart contract releases escrow directly to your wallet. No middlemen.",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20">
      <div className="mb-10 text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <p className="mt-2 text-muted-foreground">
          Three steps from idle subscription to on-chain income
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="glass relative flex flex-col items-center rounded-2xl p-6 text-center"
          >
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              {step.icon}
            </span>
            <span className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {i + 1}
            </span>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsFallback() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20">
      <div className="glass h-44 animate-pulse rounded-3xl" />
    </section>
  );
}
