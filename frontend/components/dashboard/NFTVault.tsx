"use client";

import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CHAINWILL_ABI } from "@/lib/contracts";

interface NFTRow {
  nftContract: string;
  tokenId:     string;
  beneficiary: string;
}

const EMPTY_NFT: NFTRow = { nftContract: "", tokenId: "", beneficiary: "" };

const inputStyle: React.CSSProperties = {
  flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
  borderRadius: "2px", color: "var(--text-primary)", fontFamily: "var(--font-mono)",
  fontSize: "0.72rem", padding: "0.45rem 0.65rem", outline: "none",
  letterSpacing: "0.02em", minWidth: 0,
};

export function NFTVault({ willAddress }: { willAddress: `0x${string}` }) {
  const [rows, setRows] = useState<NFTRow[]>([{ ...EMPTY_NFT }]);
  const [errors, setErrors] = useState<string[]>([]);

  const { data: existingNFTs, refetch } = useReadContract({
    address: willAddress,
    abi: CHAINWILL_ABI,
    functionName: "getNFTAssets",
    query: { refetchInterval: 15_000 },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess]);

  function addRow() { setRows((r) => [...r, { ...EMPTY_NFT }]); }
  function removeRow(i: number) { setRows((r) => r.filter((_, idx) => idx !== i)); }
  function updateRow(i: number, field: keyof NFTRow, value: string) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  function validate(): boolean {
    const errs: string[] = [];
    rows.forEach((r, i) => {
      if (!r.nftContract.startsWith("0x") || r.nftContract.length !== 42)
        errs.push(`Row ${i + 1}: invalid NFT contract address`);
      if (!r.tokenId || isNaN(Number(r.tokenId)))
        errs.push(`Row ${i + 1}: invalid token ID`);
      if (!r.beneficiary.startsWith("0x") || r.beneficiary.length !== 42)
        errs.push(`Row ${i + 1}: invalid beneficiary address`);
    });
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    writeContract({
      address: willAddress,
      abi: CHAINWILL_ABI,
      functionName: "setNFTAssets",
      args: [rows.map((r) => ({
        nftContract:  r.nftContract  as `0x${string}`,
        tokenId:      BigInt(r.tokenId),
        beneficiary:  r.beneficiary  as `0x${string}`,
      }))],
      gas: 300_000n,
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
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--text-muted)" }}>
          NFT VAULT
        </span>
        {existingNFTs && existingNFTs.length > 0 && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--green)", letterSpacing: "0.1em" }}>
            ● {existingNFTs.length} NFT{existingNFTs.length > 1 ? "S" : ""} REGISTERED
          </span>
        )}
      </div>

      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.75rem",
          color: "var(--text-secondary)", lineHeight: 1.7, letterSpacing: "0.03em",
        }}>
          Register NFTs to transfer on execution. The contract must own the NFT
          or be approved via setApprovalForAll before execution.
        </p>

        {/* Existing NFTs */}
        {existingNFTs && existingNFTs.length > 0 && (
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
            borderRadius: "2px", overflow: "hidden",
          }}>
            <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border-dim)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.15em", color: "var(--text-muted)" }}>
                REGISTERED NFTS
              </span>
            </div>
            {existingNFTs.map((nft, i) => (
              <div key={i} style={{
                padding: "0.75rem 1rem",
                borderBottom: i < existingNFTs.length - 1 ? "1px solid var(--border-dim)" : "none",
                display: "flex", flexDirection: "column", gap: "0.25rem",
              }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", flexShrink: 0 }}>
                    CONTRACT
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                    {nft.nftContract.slice(0, 10)}...{nft.nftContract.slice(-6)}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                    ID: {nft.tokenId.toString()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", flexShrink: 0 }}>
                    TO
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--amber)" }}>
                    {nft.beneficiary.slice(0, 10)}...{nft.beneficiary.slice(-6)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 24px", gap: "0.5rem" }}>
          {["NFT CONTRACT", "TOKEN ID", "GOES TO", ""].map((h, i) => (
            <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", letterSpacing: "0.15em", color: "var(--text-muted)" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Input rows */}
        {rows.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 24px", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="text" placeholder="0x contract"
              value={row.nftContract}
              onChange={(e) => updateRow(i, "nftContract", e.target.value)}
              style={inputStyle}
            />
            <input
              type="number" placeholder="ID"
              value={row.tokenId}
              onChange={(e) => updateRow(i, "tokenId", e.target.value)}
              style={{ ...inputStyle, flex: "none", width: "80px" }}
            />
            <input
              type="text" placeholder="0x beneficiary"
              value={row.beneficiary}
              onChange={(e) => updateRow(i, "beneficiary", e.target.value)}
              style={inputStyle}
            />
            {rows.length > 1 ? (
              <button
                onClick={() => removeRow(i)}
                style={{
                  background: "none", border: "none", color: "var(--text-muted)",
                  cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.9rem",
                  padding: 0, textAlign: "center" as const,
                }}
              >×</button>
            ) : <span />}
          </div>
        ))}

        <button
          onClick={addRow}
          style={{
            background: "none", border: "1px dashed var(--border-dim)", borderRadius: "2px",
            color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.65rem",
            letterSpacing: "0.15em", padding: "0.625rem", cursor: "pointer",
          }}
        >
          + ADD NFT
        </button>

        {errors.length > 0 && (
          <div style={{ background: "var(--red-dim)", border: "1px solid var(--red)", borderRadius: "2px", padding: "0.75rem 1rem" }}>
            {errors.map((e, i) => (
              <p key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--red)", letterSpacing: "0.05em", lineHeight: 1.8 }}>{e}</p>
            ))}
          </div>
        )}

        <button
          onClick={handleSave}
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
          {isConfirming ? "CONFIRMING..." : isPending ? "CONFIRM IN WALLET" : isSuccess ? "NFTS SAVED ✓" : "SAVE NFT VAULT"}
        </button>
      </div>
    </div>
  );
}
