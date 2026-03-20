"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { CHAINWILL_ABI } from "@/lib/contracts";
import { useCountdown } from "@/hooks/useCountdown";

function CountdownDigit({ value, label, frozen }: { value: number; label: string; frozen?: boolean }) {
  const str = String(value).padStart(2, "0");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "clamp(2rem, 6vw, 4rem)",
        fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1,
        color: frozen ? "var(--text-muted)" : "var(--text-primary)",
        fontVariantNumeric: "tabular-nums",
        transition: "color 0.3s ease",
      }}>
        {str}
      </span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "0.65rem",
        letterSpacing: "0.2em", textTransform: "uppercase" as const,
        color: "var(--text-muted)",
      }}>
        {label}
      </span>
    </div>
  );
}

export function WillStatus({ willAddress }: { willAddress: `0x${string}` }) {
  const { data: status, isLoading } = useReadContract({
    address: willAddress,
    abi: CHAINWILL_ABI,
    functionName: "getWillStatus",
    query: { refetchInterval: 10_000 },
  });

  const secondsRemaining = status ? Number(status[5]) : 0;
  const isPaused = status ? status[2] : false;

  // Pass 0 when paused — freezes the countdown at current value
  const countdown = useCountdown(secondsRemaining, isPaused);

  if (isLoading) {
    return (
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-dim)",
        borderRadius: "2px", padding: "2rem", display: "flex",
        alignItems: "center", justifyContent: "center", minHeight: "200px",
        color: "var(--text-muted)", fontFamily: "var(--font-mono)",
        fontSize: "0.75rem", letterSpacing: "0.15em",
      }}>
        READING CHAIN STATE...
      </div>
    );
  }

  if (!status) return null;

  const [isConfigured, willExecuted, , , , , ethBalance, beneficiaryCount] = status;

  const statusColor = willExecuted ? "var(--text-muted)"
    : isPaused ? "var(--red)"
    : countdown.urgent ? "var(--amber)"
    : "var(--green)";

  const statusLabel = willExecuted ? "EXECUTED"
    : isPaused ? "PAUSED"
    : !isConfigured ? "UNCONFIGURED"
    : countdown.expired ? "TRIGGERING"
    : countdown.urgent ? "URGENT"
    : "ACTIVE";

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
          INHERITANCE TRIGGER
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.15em", color: statusColor }}>
          ● {statusLabel}
        </span>
      </div>

      <div style={{ padding: "2.5rem 1.5rem" }}>
        {isConfigured && !willExecuted ? (
          <>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "clamp(1rem, 4vw, 3rem)",
              opacity: isPaused ? 0.4 : 1,
              transition: "opacity 0.3s ease",
            }}>
              <CountdownDigit value={countdown.days}    label="days"  frozen={isPaused} />
              <Colon frozen={isPaused} />
              <CountdownDigit value={countdown.hours}   label="hours" frozen={isPaused} />
              <Colon frozen={isPaused} />
              <CountdownDigit value={countdown.minutes} label="min"   frozen={isPaused} />
              <Colon frozen={isPaused} />
              <CountdownDigit value={countdown.seconds} label="sec"   frozen={isPaused} />
            </div>
            {isPaused && (
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: "0.65rem",
                letterSpacing: "0.15em", color: "var(--red)",
                textAlign: "center", marginTop: "1.25rem",
              }}>
                TIMER FROZEN — CONTRACT PAUSED
              </p>
            )}
          </>
        ) : willExecuted ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
              Will has been executed
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem", letterSpacing: "0.1em" }}>
              Assets distributed to beneficiaries
            </p>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-muted)", letterSpacing: "0.15em" }}>
              CONFIGURE WILL TO ACTIVATE COUNTDOWN
            </p>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid var(--border-dim)" }}>
        <Stat label="MATIC LOCKED" value={`${parseFloat(formatEther(ethBalance)).toFixed(4)}`} unit="MATIC" />
        <Stat label="BENEFICIARIES" value={beneficiaryCount.toString()} unit="/ 5" border />
        <Stat label="THRESHOLD" value={`${Math.floor(Number(status[4]) / 86400)}`} unit="DAYS" border />
      </div>
    </div>
  );
}

function Colon({ frozen }: { frozen?: boolean }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: "clamp(1.5rem, 4vw, 3rem)",
      fontWeight: 300, color: frozen ? "var(--text-muted)" : "var(--border-mid)",
      lineHeight: 1, marginBottom: "1.2rem",
      transition: "color 0.3s ease",
    }}>:</span>
  );
}

function Stat({ label, value, unit, border }: { label: string; value: string; unit: string; border?: boolean }) {
  return (
    <div style={{ padding: "1rem 1.25rem", borderLeft: border ? "1px solid var(--border-dim)" : "none" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
        {value}{" "}
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{unit}</span>
      </p>
    </div>
  );
}