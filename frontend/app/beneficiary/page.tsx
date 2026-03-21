"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BeneficiaryPortal } from "@/components/beneficiary/BeneficiaryPortal";
import Link from "next/link";

export default function BeneficiaryPage() {
  const { address, isConnected } = useAccount();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.25rem 2rem", borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-surface)", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", color: "var(--text-primary)", fontStyle: "italic" }}>
              ChainWill
            </span>
          </Link>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em",
            color: "var(--amber)", border: "1px solid var(--amber-dim)",
            padding: "0.2rem 0.5rem", borderRadius: "2px",
          }}>
            BENEFICIARY PORTAL
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" style={{
            fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.15em",
            color: "var(--text-muted)", textDecoration: "none",
          }}>
            OWNER DASHBOARD →
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 2rem" }}>
        {!isConnected ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minHeight: "60vh", gap: "1.5rem", textAlign: "center",
          }}>
            <h1 style={{
              fontFamily: "var(--font-serif)", fontSize: "clamp(2rem, 5vw, 3.5rem)",
              color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.2,
            }}>
              Are you a beneficiary?
            </h1>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: "0.8rem",
              color: "var(--text-secondary)", letterSpacing: "0.05em",
              maxWidth: "440px", lineHeight: 1.8,
            }}>
              Connect your wallet to see if you have been named as a beneficiary
              in any ChainWill contract.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <BeneficiaryPortal address={address!} />
        )}
      </main>
    </div>
  );
}
