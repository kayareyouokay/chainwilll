"use client";

import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WillStatus }        from "@/components/dashboard/WillStatus";
import { CheckInButton }     from "@/components/dashboard/CheckInButton";
import { BeneficiaryConfig } from "@/components/dashboard/BeneficiaryConfig";
import { BeneficiaryList }   from "@/components/dashboard/BeneficiaryList";
import { CreateWill }        from "@/components/dashboard/CreateWill";
import { DepositMatic }      from "@/components/dashboard/DepositMatic";
import { FACTORY_ADDRESS, FACTORY_ABI } from "@/lib/contracts";
import { DangerZone }      from "@/components/dashboard/DangerZone";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.25rem 2rem", borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-surface)", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", color: "var(--text-primary)", fontStyle: "italic" }}>
            ChainWill
          </span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em",
            color: "var(--amber)", border: "1px solid var(--amber-dim)",
            padding: "0.2rem 0.5rem", borderRadius: "2px",
          }}>
            AMOY
          </span>
        </div>
        <ConnectButton />
      </nav>

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 2rem" }}>
        {!isConnected
          ? <UnconnectedState />
          : <WalletRouter key={address} address={address!} />
        }
      </main>
    </div>
  );
}

function WalletRouter({ address }: { address: string }) {
  const addr = address as `0x${string}`;
  const { data: willAddress, isLoading, refetch } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getWill",
    args: [addr],
  });

  if (isLoading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "60vh", fontFamily: "var(--font-mono)",
        fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--text-muted)",
      }}>
        CHECKING REGISTRY...
      </div>
    );
  }

  const hasWill = willAddress && willAddress !== "0x0000000000000000000000000000000000000000";
  if (!hasWill) return <CreateWill onCreated={() => refetch()} />;
  return <ConnectedDashboard address={addr} willAddress={willAddress as `0x${string}`} />;
}

function ConnectedDashboard({ address, willAddress }: { address: `0x${string}`; willAddress: `0x${string}` }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Address bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1.25rem", background: "var(--bg-surface)",
        border: "1px solid var(--border-dim)", borderRadius: "2px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--text-muted)" }}>OWNER</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{address}</span>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.15em",
          color: "var(--green)", border: "1px solid var(--green-dim)",
          padding: "0.2rem 0.6rem", borderRadius: "2px",
        }}>
          ● OWNER
        </span>
      </div>

      {/* Will contract address */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.5rem 1.25rem", background: "var(--bg-card)",
        border: "1px solid var(--border-dim)", borderRadius: "2px",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--text-muted)", flexShrink: 0 }}>
          WILL CONTRACT
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
          {willAddress}
        </span>
        
          <a href={`https://amoy.polygonscan.com/address/${willAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--amber)", textDecoration: "none", flexShrink: 0 }}
        >
          ↗
        </a>
      </div>

      {/* Status countdown */}
      <WillStatus willAddress={willAddress} />

      {/* Beneficiary list — shows saved beneficiaries */}
      <BeneficiaryList willAddress={willAddress} />

      {/* Write actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
        <CheckInButton     willAddress={willAddress} />
        <BeneficiaryConfig willAddress={willAddress} />
      </div>

      {/* Deposit */}
      <DepositMatic willAddress={willAddress} />

      {/* Danger zone */}
      <DangerZone willAddress={willAddress} onWillDeleted={() => window.location.reload()} />

      {/* Footer */}
      <div style={{
        borderTop: "1px solid var(--border-dim)", paddingTop: "1.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
          FACTORY: {FACTORY_ADDRESS}
        </span>
        
          <a href={`https://amoy.polygonscan.com/address/${FACTORY_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--amber)", textDecoration: "none" }}
        >
          VIEW FACTORY ↗
        </a>
      </div>
    </div>
  );
}

function UnconnectedState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh", gap: "1.5rem", textAlign: "center",
    }}>
      <h1 style={{
        fontFamily: "var(--font-serif)", fontSize: "clamp(2rem, 5vw, 3.5rem)",
        color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.2, maxWidth: "600px",
      }}>
        Your assets will reach your beneficiaries.
      </h1>
      <p style={{
        fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-secondary)",
        letterSpacing: "0.05em", maxWidth: "440px", lineHeight: 1.8,
      }}>
        Connect your wallet to configure your on-chain will.
        If you become inactive, the contract executes automatically.
      </p>
      <div style={{ marginTop: "0.5rem" }}><ConnectButton /></div>
    </div>
  );
}
