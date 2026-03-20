"use client";

import { useReadContract } from "wagmi";
import { CHAINWILL_ABI } from "@/lib/contracts";

export function BeneficiaryList({ willAddress }: { willAddress: `0x${string}` }) {
  const { data: beneficiaries, isLoading } = useReadContract({
    address: willAddress,
    abi: CHAINWILL_ABI,
    functionName: "getBeneficiaries",
    query: { refetchInterval: 10_000 },
  });

  if (isLoading) return null;
  if (!beneficiaries || beneficiaries.length === 0) return null;

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-dim)",
      borderRadius: "2px", overflow: "hidden",
    }}>
      <div style={{
        padding: "0.875rem 1.5rem", borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-surface)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--text-muted)" }}>
          REGISTERED BENEFICIARIES
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--green)" }}>
          {beneficiaries.length} / 5
        </span>
      </div>

      <div>
        {beneficiaries.map((b, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.875rem 1.5rem",
            borderBottom: i < beneficiaries.length - 1 ? "1px solid var(--border-dim)" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.6rem",
                color: "var(--text-muted)", width: "1rem",
              }}>
                {i + 1}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.72rem",
                color: "var(--text-secondary)", letterSpacing: "0.02em",
              }}>
                {b.wallet.slice(0, 6)}...{b.wallet.slice(-4)}
              </span>
              
                <a href={`https://amoy.polygonscan.com/address/${b.wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--amber)", textDecoration: "none" }}
              >
                ↗
              </a>
            </div>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "0.85rem",
              color: "var(--text-primary)", letterSpacing: "-0.02em",
            }}>
              {(Number(b.allocation) / 100).toFixed(1)}
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: "2px" }}>%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
