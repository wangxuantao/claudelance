"use client";

import * as React from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";
import { Wallet, LogOut, Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMiniPayDetection } from "@/lib/minipay";
import { DEFAULT_CHAIN_ID, chainById } from "@/lib/chain";

/**
 * Unified wallet button — detects MiniPay in-app browser, falls back to
 * Privy modal for desktop/mobile web. Shows truncated address and chain
 * badge when connected. Long-press (mobile) or right-click (desktop)
 * triggers disconnect.
 */
export function WalletButton() {
  const isMiniPay = useMiniPayDetection();
  const { login, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = React.useState(false);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const connected = authenticated && !!address;
  const chain = chainById(chainId ?? DEFAULT_CHAIN_ID);
  const chainName = chain?.name ?? "Unknown";

  // Connected address display
  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  // ── MiniPay auto-connect ──
  React.useEffect(() => {
    if (!ready) return;
    if (isMiniPay && !authenticated && wallets.length === 0) {
      login();
    }
  }, [ready, isMiniPay, authenticated, wallets.length, login]);

  // ── Copy address ──
  const handleCopy = React.useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [address]);

  // ── Long-press handler (mobile) ──
  const handleTouchStart = React.useCallback(() => {
    if (!connected) return;
    longPressTimer.current = setTimeout(() => {
      disconnect();
    }, 800);
  }, [connected, disconnect]);

  const handleTouchEnd = React.useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ── Right-click handler (desktop) ──
  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      if (!connected) return;
      e.preventDefault();
      disconnect();
    },
    [connected, disconnect],
  );

  // ── Click handler ──
  const handleClick = React.useCallback(() => {
    if (!ready) return;
    if (connected) {
      handleCopy();
    } else {
      login();
    }
  }, [ready, connected, login, handleCopy]);

  // ── Render: Loading ──
  if (!ready) {
    return (
      <Button size="sm" disabled variant="ghost">
        <Wallet className="mr-2 h-4 w-4 animate-pulse" />
        Loading...
      </Button>
    );
  }

  // ── Render: Connected ──
  if (connected) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {chainName}
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
          onClick={handleClick}
          className="relative group"
          title="Click to copy address | Long-press / Right-click to disconnect"
        >
          {copied ? (
            <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
          ) : (
            <Wallet className="mr-1.5 h-3.5 w-3.5" />
          )}
          <span className="font-mono text-xs">{truncatedAddress}</span>
          {copied && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
              ✓
            </span>
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => disconnect()}
          title="Disconnect"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="sr-only">Disconnect</span>
        </Button>
      </div>
    );
  }

  // ── Render: Disconnected ──
  return (
    <Button size="sm" onClick={handleClick}>
      <Wallet className="mr-2 h-4 w-4" />
      {isMiniPay ? "Connect MiniPay" : "Connect Wallet"}
    </Button>
  );
}
