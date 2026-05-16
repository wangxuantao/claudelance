"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { celoSepolia, celoMainnet } from "@/lib/chain";
import { TransactionToast } from "@/components/transaction-toast";

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [celoSepolia, celoMainnet],
  transports: {
    [celoSepolia.id]: http(),
    [celoMainnet.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
            config={{
              loginMethods: ["wallet"],
              appearance: {
                theme: "dark",
                accentColor: "#667eea",
              },
              embeddedWallets: {
                createOnLogin: "users-without-wallets",
              },
              defaultChain: celoSepolia,
              supportedChains: [celoSepolia, celoMainnet],
            }}
          >
            {children}
            <TransactionToast />
          </PrivyProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
