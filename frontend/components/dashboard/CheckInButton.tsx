"use client";

import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { CHAINWILL_ABI } from "@/lib/contracts";

export function CheckInButton({ willAddress }: { willAddress: `0x${string}` }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { refetch } = useReadContract({
    address: willAddress,
    abi: CHAINWILL_ABI,
    functionName: "getWillStatus",
    query: { enabled: false },
  });

  // Runs exactly once when isSuccess flips to true
  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess]);

  function handleCheckIn() {
    writeContract({
      address: willAddress,
      abi: CHAINWILL_ABI,
      functionName: "checkIn",
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
          PROOF OF LIFE
        </span>
      </div>

      <div style={{ padding: "1.5rem" }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.75rem",
          color: "var(--text-secondary)", lineHeight: 1.6,
          marginBottom: "1.25rem", letterSpacing: "0.03em",
        }}>
          Calling check-in resets your inactivity timer to now.
          If you stop checking in, your will executes automatically.
        </p>

        <button
          onClick={handleCheckIn}
          disabled={isLoading}
          style={{
            width: "100%", padding: "0.875rem 1.5rem",
            background: isSuccess ? "var(--green-dim)" : "var(--amber-glow)",
            border: `1px solid ${isSuccess ? "var(--green)" : "var(--amber)"}`,
            borderRadius: "2px",
            color: isSuccess ? "var(--green)" : "var(--amber)",
            fontFamily: "var(--font-mono)", fontSize: "0.7rem",
            fontWeight: 500, letterSpacing: "0.15em",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.5 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {isConfirming ? "CONFIRMING..." : isPending ? "CONFIRM IN WALLET" : isSuccess ? "CHECKED IN ✓" : "CHECK IN — I AM ALIVE"}
        </button>

        {hash && (
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6rem",
            color: "var(--text-muted)", marginTop: "0.75rem",
            letterSpacing: "0.05em", wordBreak: "break-all",
          }}>
            TX: {hash}
          </p>
        )}
      </div>
    </div>
  );
}