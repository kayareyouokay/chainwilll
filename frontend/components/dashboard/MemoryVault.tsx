"use client";

import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CHAINWILL_ABI } from "@/lib/contracts";
import { uploadTextToIPFS, fetchFromIPFS } from "@/lib/pinata";

export function MemoryVault({ willAddress }: { willAddress: `0x${string}` }) {
  const [message, setMessage]     = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [existingMsg, setExistingMsg] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const { data: ipfsHash, refetch: refetchHash } = useReadContract({
    address: willAddress,
    abi: CHAINWILL_ABI,
    functionName: "vaultMessage",
  });

  const { data: storedPrivate } = useReadContract({
    address: willAddress,
    abi: CHAINWILL_ABI,
    functionName: "vaultMessagePrivate",
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Load existing message from IPFS when hash is available
  useEffect(() => {
    if (!ipfsHash || ipfsHash === "") return;
    setLoadingExisting(true);
    fetchFromIPFS(ipfsHash)
      .then((msg) => {
        setExistingMsg(msg);
        setIsPrivate(storedPrivate ?? true);
      })
      .catch(() => setExistingMsg(null))
      .finally(() => setLoadingExisting(false));
  }, [ipfsHash, storedPrivate]);

  useEffect(() => {
    if (isSuccess) {
      refetchHash();
      setMessage("");
      setUploadError(null);
    }
  }, [isSuccess]);

  async function handleSave() {
    if (!message.trim()) return;
    setUploading(true);
    setUploadError(null);

    try {
      const cid = await uploadTextToIPFS(message.trim());
      writeContract({
        address: willAddress,
        abi: CHAINWILL_ABI,
        functionName: "setVaultMessage",
        args: [cid, isPrivate],
        gas: 300_000n,
      });
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const isLoading = uploading || isPending || isConfirming;

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-dim)",
      borderRadius: "2px", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "0.875rem 1.5rem", borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-surface)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--text-muted)" }}>
          MEMORY VAULT
        </span>
        {ipfsHash && ipfsHash !== "" && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--green)", letterSpacing: "0.1em" }}>
            ● MESSAGE STORED
          </span>
        )}
      </div>

      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Existing message preview */}
        {loadingExisting && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            LOADING EXISTING MESSAGE...
          </p>
        )}

        {existingMsg && !loadingExisting && (
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
            borderRadius: "2px", padding: "1rem",
          }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              CURRENT MESSAGE {storedPrivate ? "· PRIVATE" : "· PUBLIC"}
            </p>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: "0.75rem",
              color: "var(--text-secondary)", lineHeight: 1.7,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {existingMsg}
            </p>
            {ipfsHash && (
              
                <a href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--amber)", textDecoration: "none", display: "block", marginTop: "0.5rem" }}
              >
                VIEW ON IPFS ↗
              </a>
            )}
          </div>
        )}

        {/* Description */}
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.75rem",
          color: "var(--text-secondary)", lineHeight: 1.7, letterSpacing: "0.03em",
        }}>
          Write a message to your beneficiaries. It will be stored on IPFS and
          the hash saved on-chain. {isPrivate ? "Only visible after execution." : "Visible to anyone now."}
        </p>

        {/* Text editor */}
        <div style={{ position: "relative" }}>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setCharCount(e.target.value.length);
            }}
            placeholder="Write your message to your beneficiaries..."
            maxLength={5000}
            rows={6}
            style={{
              width: "100%", background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)", borderRadius: "2px",
              color: "var(--text-primary)", fontFamily: "var(--font-mono)",
              fontSize: "0.78rem", padding: "0.875rem",
              outline: "none", resize: "vertical", lineHeight: 1.7,
              letterSpacing: "0.02em", boxSizing: "border-box",
            }}
          />
          <span style={{
            position: "absolute", bottom: "0.5rem", right: "0.75rem",
            fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)",
          }}>
            {charCount}/5000
          </span>
        </div>

        {/* Privacy toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.875rem 1rem", background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)", borderRadius: "2px",
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-primary)", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
              {isPrivate ? "PRIVATE — REVEAL AFTER EXECUTION" : "PUBLIC — VISIBLE NOW"}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {isPrivate
                ? "Beneficiaries can only read this after your will executes."
                : "Anyone with your will address can read this message now."}
            </p>
          </div>
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            style={{
              flexShrink: 0, marginLeft: "1.5rem",
              padding: "0.5rem 1rem",
              background: isPrivate ? "var(--amber-glow)" : "var(--bg-raised)",
              border: `1px solid ${isPrivate ? "var(--amber)" : "var(--border-mid)"}`,
              borderRadius: "2px",
              color: isPrivate ? "var(--amber)" : "var(--text-muted)",
              fontFamily: "var(--font-mono)", fontSize: "0.62rem",
              letterSpacing: "0.1em", cursor: "pointer",
              transition: "all 0.15s ease", whiteSpace: "nowrap" as const,
            }}
          >
            {isPrivate ? "PRIVATE" : "PUBLIC"}
          </button>
        </div>

        {/* Error */}
        {uploadError && (
          <div style={{
            background: "var(--red-dim)", border: "1px solid var(--red)",
            borderRadius: "2px", padding: "0.75rem 1rem",
          }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--red)", letterSpacing: "0.05em" }}>
              {uploadError}
            </p>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isLoading || !message.trim()}
          style={{
            padding: "0.875rem",
            background: isSuccess ? "var(--green-dim)" : "var(--bg-raised)",
            border: `1px solid ${isSuccess ? "var(--green)" : "var(--border-mid)"}`,
            borderRadius: "2px",
            color: isSuccess ? "var(--green)" : "var(--text-primary)",
            fontFamily: "var(--font-mono)", fontSize: "0.7rem",
            fontWeight: 500, letterSpacing: "0.15em",
            cursor: isLoading || !message.trim() ? "not-allowed" : "pointer",
            opacity: isLoading || !message.trim() ? 0.5 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {uploading ? "UPLOADING TO IPFS..." : isConfirming ? "CONFIRMING..." : isPending ? "CONFIRM IN WALLET" : isSuccess ? "MESSAGE SAVED ✓" : "SAVE TO VAULT"}
        </button>

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.6rem",
          color: "var(--text-muted)", lineHeight: 1.7, letterSpacing: "0.03em",
        }}>
          Text is uploaded to IPFS first, then the content hash is stored on-chain.
          Saving a new message overwrites the previous one.
        </p>
      </div>
    </div>
  );
}