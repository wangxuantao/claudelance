"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, Coins, ExternalLink,
  GitBranch, Shield, Clock, FileText, Sparkles
} from "lucide-react";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TOKENS = [
  { value: "cusd", label: "cUSD", icon: "💵", desc: "Celo Dollar stablecoin" },
  { value: "celo", label: "CELO", icon: "🌟", desc: "Native Celo token" },
  { value: "usdc", label: "USDC", icon: "💲", desc: "USD Coin on Celo" },
];

type FormData = {
  token: string;
  amount: string;
  repoUrl: string;
  issueUrl: string;
  stake: string;
  maxSlots: string;
  deadline: string;
  ciRequired: boolean;
};

const DEFAULT_FORM: FormData = {
  token: "cusd",
  amount: "",
  repoUrl: "",
  issueUrl: "",
  stake: "0.1",
  maxSlots: "1",
  deadline: "7",
  ciRequired: false,
};

const STEPS = ["Token & Amount", "Repo & Issue", "Stake & Slots", "Review"];

export default function PostBountyPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canNext = () => {
    switch (step) {
      case 0: return form.token && Number(form.amount) > 0;
      case 1: return form.repoUrl.startsWith("http") && form.issueUrl.startsWith("http");
      case 2: return Number(form.stake) >= 0 && Number(form.maxSlots) > 0 && Number(form.deadline) > 0;
      default: return true;
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-8">
        <Link href="/bounties" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to bounties
        </Link>

        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  i < step
                    ? "bg-green-500/20 text-green-400"
                    : i === step
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("hidden text-xs sm:inline", i <= step ? "text-foreground" : "text-muted-foreground")}>
                {s}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Token + Amount */}
        {step === 0 && (
          <GlassCard className="!p-6">
            <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-semibold">
              <Coins className="h-5 w-5" /> Select token & amount
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">Which token and how much for this bounty?</p>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {TOKENS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => update("token", t.value)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    form.token === t.value
                      ? "border-primary bg-primary/5"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <p className="mt-2 font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>

            <label className="mb-1 block text-sm font-medium">Amount</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="1.00"
                className="flex-1 rounded-xl border-2 border-white/10 bg-transparent px-4 py-3 text-lg font-semibold focus:border-primary focus:outline-none"
              />
              <span className="text-sm font-semibold text-muted-foreground">{form.token.toUpperCase()}</span>
            </div>
          </GlassCard>
        )}

        {/* Step 2: Repo + Issue */}
        {step === 1 && (
          <GlassCard className="!p-6">
            <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-semibold">
              <GitBranch className="h-5 w-5" /> Repository & issue
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">Link the GitHub repo and issue for this bounty.</p>

            <label className="mb-1 block text-sm font-medium">Repository URL</label>
            <input
              type="url"
              value={form.repoUrl}
              onChange={(e) => update("repoUrl", e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="mb-4 w-full rounded-xl border-2 border-white/10 bg-transparent px-4 py-3 focus:border-primary focus:outline-none"
            />

            <label className="mb-1 block text-sm font-medium">Issue URL</label>
            <input
              type="url"
              value={form.issueUrl}
              onChange={(e) => update("issueUrl", e.target.value)}
              placeholder="https://github.com/owner/repo/issues/1"
              className="w-full rounded-xl border-2 border-white/10 bg-transparent px-4 py-3 focus:border-primary focus:outline-none"
            />
          </GlassCard>
        )}

        {/* Step 3: Stake + Slots */}
        {step === 2 && (
          <GlassCard className="!p-6">
            <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-semibold">
              <Shield className="h-5 w-5" /> Stake & settings
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">Set stake, slots, deadline, and CI requirements.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  <Shield className="mr-1 inline h-4 w-4" /> Stake ({form.token.toUpperCase()})
                </label>
                <input type="number" min="0" step="0.01" value={form.stake}
                  onChange={(e) => update("stake", e.target.value)}
                  className="w-full rounded-xl border-2 border-white/10 bg-transparent px-4 py-3 focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  <UsersIcon className="mr-1 inline h-4 w-4" /> Max slots
                </label>
                <input type="number" min="1" max="255" value={form.maxSlots}
                  onChange={(e) => update("maxSlots", e.target.value)}
                  className="w-full rounded-xl border-2 border-white/10 bg-transparent px-4 py-3 focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  <Clock className="mr-1 inline h-4 w-4" /> Deadline (days)
                </label>
                <input type="number" min="1" max="365" value={form.deadline}
                  onChange={(e) => update("deadline", e.target.value)}
                  className="w-full rounded-xl border-2 border-white/10 bg-transparent px-4 py-3 focus:border-primary focus:outline-none" />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-white/10 p-4 transition-colors hover:border-white/20">
                  <input type="checkbox" checked={form.ciRequired}
                    onChange={(e) => update("ciRequired", e.target.checked)}
                    className="h-5 w-5 rounded accent-primary" />
                  <div>
                    <p className="font-medium">Require CI</p>
                    <p className="text-xs text-muted-foreground">Workers must pass CI checks</p>
                  </div>
                </label>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Step 4: Review */}
        {step === 3 && (
          <GlassCard className="!p-6">
            <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-semibold">
              <FileText className="h-5 w-5" /> Review & post
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">Review your bounty before posting on-chain.</p>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between rounded-lg bg-accent/50 p-3">
                <span className="text-muted-foreground">Token</span>
                <span className="font-semibold">{form.token.toUpperCase()}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-accent/50 p-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{form.amount} {form.token.toUpperCase()}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-accent/50 p-3">
                <span className="text-muted-foreground">Stake</span>
                <span className="font-semibold">{form.stake} {form.token.toUpperCase()}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-accent/50 p-3">
                <span className="text-muted-foreground">Max slots</span>
                <span className="font-semibold">{form.maxSlots}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-accent/50 p-3">
                <span className="text-muted-foreground">Deadline</span>
                <span className="font-semibold">{form.deadline} days</span>
              </div>
              <div className="flex justify-between rounded-lg bg-accent/50 p-3">
                <span className="text-muted-foreground">CI required</span>
                <span className="font-semibold">{form.ciRequired ? "Yes" : "No"}</span>
              </div>
              <div className="rounded-lg bg-accent/50 p-3">
                <p className="mb-1 text-muted-foreground">Repository</p>
                <p className="font-mono text-xs break-all">{form.repoUrl}</p>
              </div>
              <div className="rounded-lg bg-accent/50 p-3">
                <p className="mb-1 text-muted-foreground">Issue</p>
                <p className="font-mono text-xs break-all">{form.issueUrl}</p>
              </div>
            </div>

            <Button className="mt-6 w-full gap-2" size="lg">
              <Sparkles className="h-5 w-5" />
              Post Bounty ({form.amount} {form.token.toUpperCase()})
            </Button>
          </GlassCard>
        )}

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </main>
    </>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
