import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { celoMainnet, celoSepolia } from "@/lib/chain";

/**
 * Detects whether the current environment is the Opera MiniPay in-app browser.
 * MiniPay auto-injects `window.ethereum.isMiniPay = true` on load.
 */
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return window.ethereum?.isMiniPay === true;
}

/**
 * Unified wagmi config with MiniPay-first connector resolution.
 *
 * Resolution order:
 * 1. Injected (MiniPay) — auto-detected inside Opera MiniPay browser
 * 2. Privy — fallback for standard browser / embedded wallet flow
 *
 * When MiniPay is active, the injected connector connects without a popup,
 * giving users a seamless single-tap experience.
 */
export const wagmiConfig = createConfig({
  chains: [celoSepolia, celoMainnet],
  connectors: [
    injected({
      target() {
        return {
          id: "minipay",
          name: "MiniPay",
          provider: typeof window !== "undefined" ? window.ethereum : undefined,
        };
      },
    }),
  ],
  transports: {
    [celoSepolia.id]: http(),
    [celoMainnet.id]: http(),
  },
});
