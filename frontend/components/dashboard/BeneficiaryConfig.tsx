"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { isAddress } from "viem";
import { CHAINWILL_ABI } from "@/lib/contracts";

interface BeneficiaryRow {
  wallet: string;
  allocation: string;
  warning: string | null;
  checking: boolean;
}

const EMPTY_ROW: BeneficiaryRow = { wallet: "", allocation: "", warning: null, checking: false };

const inputStyle: React.CSSProperties = {
  flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
  borderRadius: "2px", color: "var(--text-primary)", fontFamily: "var(--font-mono)",
  fontSize: "0.75rem", padding: "0.5rem 0.75rem", outline: "none", letterSpacing: "0.03em",
};

export function BeneficiaryConfig({ willAddress }: { willAddress: `0x${string}` }) {
  const [rows, setRows] = useState<BeneficiaryRow[]>([{ ...EMPTY_ROW }]);
  const [thresholdDays, setThresholdDays] = useState("90");
  const [errors, setErrors] = useState<string[]>([]);

  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function addRow() {
    if (rows.length < 5) setRows((r) => [...r, { ...EMPTY_ROW }]);
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof BeneficiaryRow, value: string) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: value, warning: null } : row));
  }

  // Validate address on-chain when user finishes typing
  async function checkAddress(i: number, addr: string) {
    if (!isAddress(addr) || !publicClient) return;

    setRows((r) => r.map((row, idx) => idx === i ? { ...row, checking: true, warning: null } : row));

    try {
      const [balance, txCount] = await Promise.all([
        publicClient.getBalance({ address: addr as `0x${string}` }),
        publicClient.getTransactionCount({ address: addr as `0x${string}` }),
      ]);

      const warning = balance === 0n && txCount === 0
        ? "Address has no on-chain activity — verify it is correct"
        : null;

      setRows((r) => r.map((row, idx) => idx === i ? { ...row, checking: false, warning } : row));
    } catch {
      setRows((r) => r.map((row, idx) => idx === i ? { ...row, checking: false } : row));
    }
  }

  function validate(): boolean {
    const errs: string[] = [];
    const total = rows.reduce((s, r) => s + (parseFloat(r.allocation) || 0), 0);
    rows.forEach((r, i) => {
      if (!isAddress(r.wallet)) errs.push(`Row ${i + 1}: invalid address`);
      if (!r.allocation || parseFloat(r.allocation) <= 0) errs.push(`Row ${i + 1}: allocation must be > 0`);
    });
    if (Math.round(total) !== 100) errs.push(`Allocations must sum to 100% (currently ${total.toFixed(1)}%)`);
    const days = parseInt(thresholdDays);
    if (isNaN(days) || days < 30) errs.push("Threshold must be at least 30 days");
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    writeContract({
      address: willAddress,
      abi: CHAINWILL_ABI,
      functionName: "configureWill",
      args: [
        rows.map((r) => ({
          wallet: r.wallet as `0x${string}`,
          allocation: BigInt(Math.round(parseFloat(r.allocation) * 100)),
        })),
        BigInt(parseInt(thresholdDays) * 86400),
      ],
    });
  }

  const totalAlloc = rows.reduce((s, r) => s + (parseFloat(r.allocation) || 0), 0);
  const isLoading = isPending || isConfirming;

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-dim)",
      borderRadius: "2px", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.875rem 1.5rem", borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-surface)",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--text-muted)" }}>
          BENEFICIARY CONFIGURATION
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: Math.round(totalAlloc) === 100 ? "var(--green)" : "var(--amber)" }}>
          {totalAlloc.toFixed(1)}% / 100%
        </span>
      </div>

      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", width: "1.25rem", flexShrink: 0 }}>
                {i + 1}
              </span>
              <input
                type="text"
                placeholder="0x address"
                value={row.wallet}
                onChange={(e) => updateRow(i, "wallet", e.target.value)}
                onBlur={(e) => checkAddress(i, e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: row.warning ? "var(--amber-dim)" : "var(--border-dim)",
                }}
              />
              <input
                type="number"
                placeholder="%"
                value={row.allocation}
                onChange={(e) => updateRow(i, "allocation", e.target.value)}
                min="1"
                max="100"
                style={{ ...inputStyle, width: "72px", flex: "none" }}
              />
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(i)}
                  style={{
                    background: "none", border: "none", color: "var(--text-muted)",
                    cursor: "pointer", fontFamily: "var(--font-mono)",
                    fontSize: "0.9rem", padding: "0 0.25rem", flexShrink: 0,
                  }}
                >×</button>
              )}
            </div>

            {/* Address status indicators */}
            {row.checking && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", paddingLeft: "2rem" }}>
                CHECKING ADDRESS...
              </p>
            )}
            {!row.checking && row.warning && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--amber)", letterSpacing: "0.05em", paddingLeft: "2rem" }}>
                ⚠ {row.warning}
              </p>
            )}
            {!row.checking && !row.warning && isAddress(row.wallet) && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--green)", letterSpacing: "0.05em", paddingLeft: "2rem" }}>
                ✓ Address verified on-chain
              </p>
            )}
          </div>
        ))}

        {rows.length < 5 && (
          <button
            onClick={addRow}
            style={{
              background: "none", border: "1px dashed var(--border-dim)", borderRadius: "2px",
              color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.65rem",
              letterSpacing: "0.15em", padding: "0.625rem", cursor: "pointer",
            }}
          >
            + ADD BENEFICIARY ({rows.length}/5)
          </button>
        )}

        <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.15em", color: "var(--text-muted)", flexShrink: 0 }}>
            INACTIVITY THRESHOLD
          </span>
          <input
            type="number"
            value={thresholdDays}
            onChange={(e) => setThresholdDays(e.target.value)}
            min="30"
            style={{ ...inputStyle, width: "80px", flex: "none" }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>DAYS</span>
        </div>

        {errors.length > 0 && (
          <div style={{ background: "var(--red-dim)", border: "1px solid var(--red)", borderRadius: "2px", padding: "0.75rem 1rem" }}>
            {errors.map((e, i) => (
              <p key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--red)", letterSpacing: "0.05em", lineHeight: 1.8 }}>{e}</p>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            padding: "0.875rem",
            background: isSuccess ? "var(--green-dim)" : "var(--bg-raised)",
            border: `1px solid ${isSuccess ? "var(--green)" : "var(--border-mid)"}`,
            borderRadius: "2px",
            color: isSuccess ? "var(--green)" : "var(--text-primary)",
            fontFamily: "var(--font-mono)", fontSize: "0.7rem",
            fontWeight: 500, letterSpacing: "0.15em",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.5 : 1, transition: "all 0.15s ease",
          }}
        >
          {isConfirming ? "CONFIRMING..." : isPending ? "CONFIRM IN WALLET" : isSuccess ? "WILL CONFIGURED ✓" : "SAVE CONFIGURATION"}
        </button>
      </div>
    </div>
  );
}