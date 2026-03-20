"use client";

import { useEffect, useState, useRef } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CHAINWILL_ABI, FACTORY_ABI, FACTORY_ADDRESS } from "@/lib/contracts";

type Action = "pause" | "unpause" | "withdraw" | "reset" | "delete";
type ActionQueue = Action[];

export function DangerZone({
  willAddress,
  onWillDeleted,
}: {
  willAddress: `0x${string}`;
  onWillDeleted: () => void;
}) {
  const [confirming, setConfirming]   = useState<Action | null>(null);
  const [txError, setTxError]         = useState<string | null>(null);
  const [queue, setQueue]             = useState<ActionQueue>([]);
  const [queueLabel, setQueueLabel]   = useState<string | null>(null);

  // Prevent double-firing the queue
  const firingRef = useRef(false);

  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: willAddress,
    abi: CHAINWILL_ABI,
    functionName: "paused",
    query: { refetchInterval: 10_000 },
  });

  const { data: willStatus, refetch: refetchStatus } = useReadContract({
    address: willAddress,
    abi: CHAINWILL_ABI,
    functionName: "getWillStatus",
    query: { refetchInterval: 10_000 },
  });

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const contractBalance = willStatus ? willStatus[6] : 0n;
  const hasBalance      = contractBalance > 0n;
  const isLoading       = isPending || isConfirming || queue.length > 0;

  // After each tx confirms — advance queue
  useEffect(() => {
    if (!isSuccess) return;

    // Refetch first, then advance queue after state is fresh
    Promise.all([refetchPaused(), refetchStatus()]).then(() => {
      setTxError(null);
      setQueue((prev) => {
        firingRef.current = false;
        const remaining = prev.slice(1);
        if (remaining.length === 0) {
          setQueueLabel(null);
          if (prev[0] === "delete") onWillDeleted();
        }
        return remaining;
      });
    });
  }, [isSuccess]);

  // Fire next queued action — guarded by firingRef
    useEffect(() => {
    if (queue.length === 0) return;
    if (isPending || isConfirming) return;
    if (firingRef.current) return;

    firingRef.current = true;
    // Wait 2 full seconds for chain state to settle before next tx
    const t = setTimeout(() => {
      executeAction(queue[0]);
    }, 2000);
    return () => clearTimeout(t);
  }, [queue, isPending, isConfirming]);

  // Surface write errors and cancel queue
  useEffect(() => {
    if (!writeError) return;
    firingRef.current = false;
    const msg = writeError.message ?? "Transaction failed";
    // Extract the useful first line
    const firstLine = msg.split("\n")[0].slice(0, 300);
    setTxError(firstLine);
    setQueue([]);
    setQueueLabel(null);
  }, [writeError]);

  function executeAction(action: Action) {
    // Explicit gas limit bypasses bad RPC gas estimation on Amoy
    const GAS = 300_000n;

    switch (action) {
      case "pause":
        writeContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "pause", gas: GAS });
        break;
      case "unpause":
        writeContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "unpause", gas: GAS });
        break;
      case "withdraw":
        writeContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "emergencyWithdrawETH", gas: GAS });
        break;
      case "reset":
        writeContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "resetWill", gas: GAS });
        break;
      case "unpause":
        writeContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "unpause", gas: GAS });
        break;
      case "delete":
        writeContract({ address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "deleteWill", gas: GAS });
        break;
    }
  }

  function buildQueue(action: Action): ActionQueue {
    const q: ActionQueue = [];
    if (!isPaused) q.push("pause");
    if (hasBalance && (action === "reset" || action === "delete")) q.push("withdraw");
    q.push(action);
    return q;
  }

  function handleAction(action: Action) {
    if (confirming !== action) {
      setConfirming(action);
      setTxError(null);
      return;
    }
    setConfirming(null);

    const q = buildQueue(action);
    const labels: Record<Action, string> = {
      pause:   "Pausing contract...",
      unpause: "Unpausing contract...",
      withdraw:"Withdrawing MATIC...",
      reset:   hasBalance ? "Withdrawing MATIC then resetting..." : "Resetting will...",
      delete:  hasBalance ? "Withdrawing MATIC then deleting..." : "Deleting will...",
    };
    setQueueLabel(labels[action]);
    setQueue(q);
  }

  const currentStep = queue[0];
  const stepLabel: Record<Action, string> = {
    pause:   "PAUSING...",
    unpause: "UNPAUSING...",
    withdraw:"WITHDRAWING MATIC...",
    reset:   "RESETTING WILL...",
    delete:  "DELETING FROM REGISTRY...",
  };

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--red-dim)",
      borderRadius: "2px", overflow: "hidden",
    }}>
      <div style={{
        padding: "0.875rem 1.5rem", borderBottom: "1px solid var(--red-dim)",
        background: "var(--bg-surface)",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <span style={{ color: "var(--red)", fontSize: "0.8rem" }}>⚠</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--red)" }}>
          DANGER ZONE
        </span>
        {isPaused && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.15em",
            color: "var(--red)", border: "1px solid var(--red-dim)",
            padding: "0.15rem 0.5rem", borderRadius: "2px", marginLeft: "auto",
          }}>
            CONTRACT PAUSED
          </span>
        )}
      </div>

      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>

        {/* Queue progress */}
        {isLoading && queueLabel && (
          <div style={{
            padding: "0.75rem 1rem", background: "var(--amber-glow)",
            border: "1px solid var(--amber)", borderRadius: "2px",
            display: "flex", alignItems: "center", gap: "0.75rem",
          }}>
            <span style={{ color: "var(--amber)", fontSize: "0.7rem" }}>◌</span>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--amber)", letterSpacing: "0.1em" }}>
              {currentStep ? stepLabel[currentStep] : queueLabel}
            </p>
          </div>
        )}

        <ActionRow
          title={isPaused ? "UNPAUSE CONTRACT" : "PAUSE CONTRACT"}
          description={isPaused
            ? "Resume normal operation. Chainlink automation re-activates."
            : "Freeze all activity. Chainlink cannot execute while paused."}
          actionKey={isPaused ? "unpause" : "pause"}
          confirming={confirming}
          isLoading={isLoading}
          onAction={handleAction}
          buttonLabel={isPaused ? "UNPAUSE" : "PAUSE"}
          variant="warning"
        />

        <ActionRow
          title="EMERGENCY WITHDRAW"
          description={isPaused
            ? `Recover all MATIC from contract to your wallet.`
            : "Pause the contract first to enable emergency withdrawal."}
          actionKey="withdraw"
          confirming={confirming}
          isLoading={isLoading}
          onAction={handleAction}
          buttonLabel="WITHDRAW"
          variant="danger"
          disabled={!isPaused}
        />

        <ActionRow
          title="RESET WILL"
          description={
            hasBalance
              ? "Will auto-pause and withdraw MATIC before resetting."
              : "Clear all beneficiaries and start fresh. Contract stays deployed."
          }
          actionKey="reset"
          confirming={confirming}
          isLoading={isLoading}
          onAction={handleAction}
          buttonLabel="RESET"
          variant="danger"
        />

        <ActionRow
          title="DELETE WILL"
          description={
            hasBalance
              ? "Will auto-pause and withdraw MATIC before removing from registry."
              : "Remove from factory registry. Your wallet can create a new will after this."
          }
          actionKey="delete"
          confirming={confirming}
          isLoading={isLoading}
          onAction={handleAction}
          buttonLabel="DELETE"
          variant="danger"
        />

        {txError && (
          <div style={{
            background: "var(--red-dim)", border: "1px solid var(--red)",
            borderRadius: "2px", padding: "0.75rem 1rem",
          }}>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--red)",
              letterSpacing: "0.05em", lineHeight: 1.7, wordBreak: "break-all",
            }}>
              {txError}
            </p>
          </div>
        )}

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.6rem",
          color: "var(--text-muted)", lineHeight: 1.7, letterSpacing: "0.03em",
          borderTop: "1px solid var(--border-dim)", paddingTop: "0.875rem",
        }}>
          Reset and Delete auto-withdraw MATIC if balance exists.
          All actions require a second click to confirm.
        </p>
      </div>
    </div>
  );
}

function ActionRow({
  title, description, actionKey, confirming, isLoading, onAction, buttonLabel, variant, disabled,
}: {
  title: string;
  description: string;
  actionKey: Action;
  confirming: string | null;
  isLoading: boolean;
  onAction: (a: Action) => void;
  buttonLabel: string;
  variant: "warning" | "danger";
  disabled?: boolean;
}) {
  const isConfirming = confirming === actionKey;
  const color    = variant === "warning" ? "var(--amber)" : "var(--red)";
  const dimColor = variant === "warning" ? "var(--amber-dim)" : "var(--red-dim)";

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "1rem 1.25rem", background: "var(--bg-surface)",
      border: `1px solid ${disabled ? "var(--border-dim)" : dimColor}`,
      borderRadius: "2px", opacity: disabled ? 0.4 : 1,
    }}>
      <div style={{ flex: 1, marginRight: "1.5rem" }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.7rem",
          color: disabled ? "var(--text-muted)" : "var(--text-primary)",
          letterSpacing: "0.05em", marginBottom: "0.3rem",
        }}>
          {title}
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
      <button
        onClick={() => onAction(actionKey)}
        disabled={isLoading || disabled}
        style={{
          flexShrink: 0, padding: "0.6rem 1.25rem",
          background: isConfirming ? `rgba(${variant === "warning" ? "245,158,11" : "239,68,68"},0.15)` : "var(--bg-raised)",
          border: `1px solid ${isConfirming ? color : dimColor}`,
          borderRadius: "2px",
          color: isConfirming ? color : "var(--text-muted)",
          fontFamily: "var(--font-mono)", fontSize: "0.65rem",
          letterSpacing: "0.1em",
          cursor: isLoading || disabled ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          whiteSpace: "nowrap" as const,
        }}
      >
        {isLoading && isConfirming ? "WAITING..." : isConfirming ? "CONFIRM?" : buttonLabel}
      </button>
    </div>
  );
}