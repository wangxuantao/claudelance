"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, CheckCircle, Clock, Coins, ExternalLink,
  GitPullRequest, Loader2, Shield, Trophy, Users
} from "lucide-react";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Resolved",
  2: "Cancelled",
  3: "Expired",
};

const STATUS_COLORS: Record<number, string> = {
  0: "text-green-400 bg-green-400/10",
  1: "text-blue-400 bg-blue-400/10",
  2: "text-red-400 bg-red-400/10",
  3: "text-yellow-400 bg-yellow-400/10",
};

type BountyDetail = {
  id: string;
  poster: string;
  amount: string;
  winner: string;
  stakeRequired: string;
  token: string;
  deadline: number;
  maxSlots: number;
  claimedSlots: number;
  bountyType: number;
  ciRequired: boolean;
  targetWorker: string;
  status: number;
  targetRepoUrl: string;
  instructionUrl: string;
  tokenSymbol: string;
  tokenDecimals: number;
};

type Submission = {
  worker: string;
  commitHash: string;
  submittedAt: number;
  ciPassed: boolean;
  prUrl: string;
};

export default function BountyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bounty, setBounty] = useState<BountyDetail | null>(null);
  const [claimers, setClaimers] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/bounty/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setBounty(d.bounty);
        setClaimers(d.claimers || []);
        setSubmissions(d.submissions || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (error || !bounty) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-2xl px-4 pt-20 text-center">
          <p className="text-lg text-destructive">{error || "Bounty not found"}</p>
          <Link href="/bounties" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to bounties
          </Link>
        </div>
      </>
    );
  }

  const formattedAmount = (Number(bounty.amount) / 10 ** bounty.tokenDecimals).toFixed(2);
  const isOpen = bounty.status === 0;
  const isPoster = false; // Would need wallet connection to determine
  const hasSubmitted = false; // Would need wallet connection to determine
  const isClaimer = false; // Would need wallet connection

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
        <Link href="/bounties" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to bounties
        </Link>

        {/* Header Card */}
        <GlassCard className="!p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[bounty.status])}>
                  {STATUS_LABELS[bounty.status]}
                </span>
                {bounty.ciRequired && (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                    <CheckCircle className="mr-1 inline h-3 w-3" /> CI Required
                  </span>
                )}
              </div>
              <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
                Bounty #{bounty.id}
              </h1>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  <span className="font-semibold text-foreground">{formattedAmount} {bounty.tokenSymbol}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Stake {Number(bounty.stakeRequired) / 10 ** bounty.tokenDecimals} {bounty.tokenSymbol}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {bounty.claimedSlots}/{bounty.maxSlots} slots
                </span>
                {bounty.deadline > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(Number(bounty.deadline) * 1000).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-col gap-2">
              {isOpen && !isPoster && !isClaimer && (
                <Button className="gap-2">
                  <Shield className="h-4 w-4" /> Claim Slot
                </Button>
              )}
              {isOpen && isClaimer && !hasSubmitted && (
                <Button className="gap-2">
                  <GitPullRequest className="h-4 w-4" /> Submit PR
                </Button>
              )}
              {isOpen && isPoster && submissions.length > 0 && (
                <Button variant="secondary" className="gap-2">
                  <Trophy className="h-4 w-4" /> Pick Winner
                </Button>
              )}
              {bounty.targetRepoUrl && (
                <a href={bounty.targetRepoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3 w-3" /> View repo
                </a>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Details */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <GlassCard className="!p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <GitPullRequest className="h-4 w-4" /> Submissions ({submissions.length})
            </h2>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet</p>
            ) : (
              <ul className="space-y-3">
                {submissions.map((s, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-accent/50 p-3 text-sm">
                    <span className="font-mono text-xs">{s.worker.slice(0, 10)}...</span>
                    <span className="flex items-center gap-2">
                      {s.ciPassed ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-400" />
                      )}
                      {s.prUrl ? (
                        <a href={s.prUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          View PR <ExternalLink className="inline h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No PR</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard className="!p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4" /> Claimers ({claimers.length})
            </h2>
            {claimers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No claimers yet</p>
            ) : (
              <ul className="space-y-2">
                {claimers.map((c, i) => (
                  <li key={i} className="rounded-lg bg-accent/50 p-3">
                    <span className="font-mono text-xs">{c.slice(0, 12)}...{c.slice(-4)}</span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>

        {/* Repo Info */}
        {bounty.targetRepoUrl && (
          <GlassCard className="mt-6 !p-6">
            <h2 className="mb-2 font-semibold">Target Repository</h2>
            <a href={bounty.targetRepoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              {bounty.targetRepoUrl} <ExternalLink className="h-3 w-3" />
            </a>
            {bounty.instructionUrl && (
              <a href={bounty.instructionUrl} target="_blank" rel="noreferrer" className="ml-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                Instructions <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </GlassCard>
        )}
      </main>
    </>
  );
}
