"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { FACTORY_ADDRESS, FACTORY_ABI } from "@/lib/contracts";

export function CreateWill({ onCreated }: { onCreated: () => void }) {
  const [thresholdDays, setThresholdDays] = useState("90");
  const [error, setError] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Runs exactly once when isSuccess flips to true
  useEffect(() => {
    if (isSuccess) onCreated();
  }, [isSuccess]);

  function handleCreate() {
    setError("");
    const days = parseInt(thresholdDays);
    if (isNaN(days) || days < 30) {
      setError("Threshold must be at least 30 days");
      return;
    }
    writeContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "createWill",
      args: [BigInt(days * 86400)],
    });
  }

  const isLoading = isPending || isConfirming;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh", gap: "2rem", textAlign: "center",
    }}>
      <div>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.65rem",
          letterSpacing: "0.3em", color: "var(--amber)", marginBottom: "1rem",
        }}>
          NO WILL FOUND FOR THIS WALLET
        </p>
        <h2 style={{
          fontFamily: "var(--font-serif)", fontSize: "clamp(1.8rem, 4vw, 3rem)",
          color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.2,
          marginBottom: "1rem",
        }}>
          Create your on-chain will
        </h2>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.78rem",
          color: "var(--text-secondary)", lineHeight: 1.8,
          letterSpacing: "0.03em", maxWidth: "440px", margin: "0 auto",
        }}>
          Deploy a personal ChainWill contract tied to this wallet.
          You can configure beneficiaries and assets after creation.
        </p>
      </div>

      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-dim)",
        borderRadius: "2px", padding: "2rem", width: "100%", maxWidth: "420px",
        display: "flex", flexDirection: "column", gap: "1.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "0.65rem",
            letterSpacing: "0.15em", color: "var(--text-muted)", flexShrink: 0,
          }}>
            INACTIVITY THRESHOLD
          </span>
          <input
            type="number"
            value={thresholdDays}
            onChange={(e) => setThresholdDays(e.target.value)}
            min="30"
            style={{
              flex: "1 1 auto", minWidth: 0, background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)", borderRadius: "2px",
              color: "var(--text-primary)", fontFamily: "var(--font-mono)",
              fontSize: "0.85rem", padding: "0.5rem 0.75rem", outline: "none",
            }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>
            DAYS
          </span>
        </div>

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.65rem",
          color: "var(--text-muted)", lineHeight: 1.7, letterSpacing: "0.03em",
        }}>
          If you don't check in for this many days, your will executes automatically.
          Minimum 30 days. You can change this later.
        </p>

        {error && (
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "0.65rem",
            color: "var(--red)", letterSpacing: "0.05em",
          }}>
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={isLoading}
          style={{
            padding: "0.875rem",
            background: "var(--amber-glow)",
            border: "1px solid var(--amber)",
            borderRadius: "2px",
            color: "var(--amber)",
            fontFamily: "var(--font-mono)", fontSize: "0.7rem",
            fontWeight: 500, letterSpacing: "0.15em",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {isConfirming ? "DEPLOYING CONTRACT..." : isPending ? "CONFIRM IN WALLET" : "CREATE MY WILL"}
        </button>

        {hash && (
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6rem",
            color: "var(--text-muted)", letterSpacing: "0.05em",
            wordBreak: "break-all",
          }}>
            TX: {hash}
          </p>
        )}
      </div>
    </div>
  );
}