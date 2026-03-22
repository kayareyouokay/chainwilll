"use client";

import { useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";

export function DepositMatic({ willAddress }: { willAddress: `0x${string}` }) {
  const [amount, setAmount] = useState("0.1");
  const { address } = useAccount();

  const { sendTransaction, data: hash, isPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleDeposit() {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    sendTransaction({
      to: willAddress,
      value: parseEther(amount),
    });
  }

  const isLoading = isPending || isConfirming;

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-dim)",
      borderRadius: "2px", overflow: "hidden",
    }}>
      <div style={{
        padding: "0.875rem 1.5rem", borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-surface)",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--text-muted)" }}>
          DEPOSIT FUNDS TO WILL
        </span>
      </div>

      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.75rem",
          color: "var(--text-secondary)", lineHeight: 1.6, letterSpacing: "0.03em",
        }}>
          Send funds to your will contract. On execution, they will be split
          proportionally among your beneficiaries.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.1"
            style={{
              flex: 1, background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)", borderRadius: "2px",
              color: "var(--text-primary)", fontFamily: "var(--font-mono)",
              fontSize: "0.85rem", padding: "0.5rem 0.75rem", outline: "none",
            }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", flexShrink: 0 }}>
            FUNDS
          </span>
        </div>

        <button
          onClick={handleDeposit}
          disabled={isLoading || !address}
          style={{
            padding: "0.875rem",
            background: isSuccess ? "var(--green-dim)" : "var(--bg-raised)",
            border: `1px solid ${isSuccess ? "var(--green)" : "var(--border-mid)"}`,
            borderRadius: "2px",
            color: isSuccess ? "var(--green)" : "var(--text-primary)",
            fontFamily: "var(--font-mono)", fontSize: "0.7rem",
            fontWeight: 500, letterSpacing: "0.15em",
            cursor: isLoading || !address ? "not-allowed" : "pointer",
            opacity: isLoading || !address ? 0.5 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {isConfirming ? "CONFIRMING..." : isPending ? "CONFIRM IN WALLET" : isSuccess ? "DEPOSITED ✓" : "DEPOSIT"}
        </button>

        {hash && (
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6rem",
            color: "var(--text-muted)", letterSpacing: "0.05em", wordBreak: "break-all",
          }}>
            TX: {hash}
          </p>
        )}
      </div>
    </div>
  );
}
