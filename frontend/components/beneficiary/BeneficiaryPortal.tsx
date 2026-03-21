"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { FACTORY_ADDRESS, FACTORY_ABI, CHAINWILL_ABI } from "@/lib/contracts";
import { fetchFromIPFS } from "@/lib/pinata";

interface NFTAsset {
  nftContract: `0x${string}`;
  tokenId:     bigint;
  beneficiary: `0x${string}`;
}

interface WillEntry {
  willAddress:        `0x${string}`;
  ownerAddress:       `0x${string}`;
  allocation:         bigint;
  isConfigured:       boolean;
  willExecuted:       boolean;
  isPaused:           boolean;
  timeRemaining:      bigint;
  ethBalance:         bigint;
  threshold:          bigint;
  totalBeneficiaries: bigint;
  vaultIpfsHash:      string;
  vaultPrivate:       boolean;
  nftAssets:          NFTAsset[];
}

export function BeneficiaryPortal({ address }: { address: string }) {
  const publicClient = usePublicClient();
  const [wills, setWills]     = useState<WillEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal]     = useState(0);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!publicClient) return;
    scanAllWills();
  }, [address, publicClient]);

  async function scanAllWills() {
    if (!publicClient) return;
    setLoading(true);
    setWills([]);
    setError(null);

    try {
      const totalWills = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "totalWills",
      }) as bigint;

      setTotal(Number(totalWills));
      if (totalWills === 0n) { setLoading(false); return; }

      const found: WillEntry[] = [];
      const addr = address.toLowerCase();

      for (let i = 0; i < Number(totalWills); i++) {
        const willAddress = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: "allWills",
          args: [BigInt(i)],
        }) as `0x${string}`;

        setScanned(i + 1);

        const [beneficiaries, status, owner, vaultHash, vaultPrivate, nftAssets] =
          await Promise.all([
            publicClient.readContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "getBeneficiaries" }) as Promise<Array<{ wallet: `0x${string}`; allocation: bigint }>>,
            publicClient.readContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "getWillStatus"    }) as Promise<[boolean,boolean,boolean,bigint,bigint,bigint,bigint,bigint]>,
            publicClient.readContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "owner"            }) as Promise<`0x${string}`>,
            publicClient.readContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "vaultMessage"     }) as Promise<string>,
            publicClient.readContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "vaultMessagePrivate" }) as Promise<boolean>,
            publicClient.readContract({ address: willAddress, abi: CHAINWILL_ABI, functionName: "getNFTAssets"     }) as Promise<any>,
          ]);

        const match = beneficiaries.find((b) => b.wallet.toLowerCase() === addr);
        if (!match) continue;

        found.push({
          willAddress, ownerAddress: owner,
          allocation:         match.allocation,
          isConfigured:       status[0],
          willExecuted:       status[1],
          isPaused:           status[2],
          timeRemaining:      status[5],
          ethBalance:         status[6],
          totalBeneficiaries: status[7],
          threshold:          status[4],
          vaultIpfsHash:      vaultHash,
          vaultPrivate,
          nftAssets,
        });
      }

      setWills(found);
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) ?? "Failed to scan wills");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-dim)",
          borderRadius: "2px", padding: "2rem",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
        }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.15em", color: "var(--text-muted)" }}>
            SCANNING CONTRACTS...
          </p>
          {total > 0 && (
            <>
              <div style={{ width: "100%", height: "2px", background: "var(--border-dim)", borderRadius: "1px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: "var(--amber)",
                  width: `${(scanned / total) * 100}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                {scanned} / {total} wills scanned
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1.25rem", background: "var(--bg-surface)",
        border: "1px solid var(--border-dim)", borderRadius: "2px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--text-muted)" }}>SCANNING AS</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{address}</span>
        </div>
        <button onClick={scanAllWills} style={{
          background: "none", border: "1px solid var(--border-dim)", borderRadius: "2px",
          color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.6rem",
          letterSpacing: "0.15em", padding: "0.3rem 0.75rem", cursor: "pointer",
        }}>RESCAN</button>
      </div>

      {error && (
        <div style={{ background: "var(--red-dim)", border: "1px solid var(--red)", borderRadius: "2px", padding: "0.75rem 1rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--red)" }}>{error}</p>
        </div>
      )}

      {wills.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "1rem", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
            No wills found for this wallet
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.05em", maxWidth: "400px", lineHeight: 1.8 }}>
            Scanned {total} contract{total !== 1 ? "s" : ""} on Polygon Amoy.
            Your wallet is not listed as a beneficiary on any of them.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--green)", letterSpacing: "0.1em" }}>
            ● FOUND IN {wills.length} WILL{wills.length > 1 ? "S" : ""}
          </p>
          {wills.map((w, i) => <WillCard key={i} will={w} />)}
        </>
      )}
    </div>
  );
}

function WillCard({ will }: { will: WillEntry }) {
  const [vaultText, setVaultText]       = useState<string | null>(null);
  const [loadingVault, setLoadingVault] = useState(false);
  const [vaultOpen, setVaultOpen]       = useState(false);

  const canReadVault = will.vaultIpfsHash !== "" && (
    will.willExecuted || !will.vaultPrivate
  );

  async function loadVaultMessage() {
    if (!canReadVault || vaultText !== null) { setVaultOpen(true); return; }
    setLoadingVault(true);
    try {
      const text = await fetchFromIPFS(will.vaultIpfsHash);
      setVaultText(text);
      setVaultOpen(true);
    } catch {
      setVaultText("Failed to load message from IPFS.");
      setVaultOpen(true);
    } finally {
      setLoadingVault(false);
    }
  }

  const statusColor = will.willExecuted ? "var(--text-muted)" : will.isPaused ? "var(--red)" : "var(--green)";
  const statusLabel = will.willExecuted ? "EXECUTED" : will.isPaused ? "PAUSED" : !will.isConfigured ? "UNCONFIGURED" : "ACTIVE";

  const days  = Math.floor(Number(will.timeRemaining) / 86400);
  const hours = Math.floor((Number(will.timeRemaining) % 86400) / 3600);
  const yourShare = will.willExecuted
    ? null
    : BigInt(Math.floor(Number(will.ethBalance) * Number(will.allocation) / 10000));

  // NFTs assigned specifically to this beneficiary
  const myNFTs = will.nftAssets.filter(
    (n) => n.beneficiary.toLowerCase() === will.ownerAddress.toLowerCase()
  );

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-dim)", borderRadius: "2px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.875rem 1.5rem", borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--text-muted)" }}>WILL CONTRACT</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
            {will.willAddress.slice(0, 10)}...{will.willAddress.slice(-6)}
          </span>
          <a href={`https://amoy.polygonscan.com/address/${will.willAddress}`} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--amber)", textDecoration: "none" }}>↗</a>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: statusColor }}>● {statusLabel}</span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", borderBottom: "1px solid var(--border-dim)" }}>
        <StatCell label="YOUR ALLOCATION" value={`${(Number(will.allocation) / 100).toFixed(1)}%`} />
        <StatCell label="YOUR SHARE" value={yourShare !== null ? `${parseFloat(formatEther(yourShare)).toFixed(4)} MATIC` : "—"} border />
        <StatCell
          label={will.willExecuted ? "EXECUTED" : "TRIGGERS IN"}
          value={will.willExecuted ? "Assets distributed" : will.timeRemaining === 0n ? "Imminent" : `${days}d ${hours}h`}
        />
        <StatCell label="TOTAL IN CONTRACT" value={`${parseFloat(formatEther(will.ethBalance)).toFixed(4)} MATIC`} border />
      </div>

      {/* Owner */}
      <div style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid var(--border-dim)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--text-muted)", flexShrink: 0 }}>OWNER</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-secondary)" }}>{will.ownerAddress}</span>
      </div>

      {/* NFTs assigned to this beneficiary */}
      {will.nftAssets.length > 0 && (
        <div style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid var(--border-dim)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
            NFTS IN THIS WILL
          </p>
          {will.nftAssets.map((nft, i) => (
            <div key={i} style={{
              display: "flex", gap: "1rem", alignItems: "center",
              padding: "0.5rem 0",
              borderBottom: i < will.nftAssets.length - 1 ? "1px solid var(--border-dim)" : "none",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                {nft.nftContract.slice(0, 8)}...
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                ID: {nft.tokenId.toString()}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.6rem", marginLeft: "auto",
                color: nft.beneficiary.toLowerCase() === will.ownerAddress.toLowerCase()
                  ? "var(--green)" : "var(--text-muted)",
              }}>
                → {nft.beneficiary.slice(0, 8)}...{nft.beneficiary.slice(-4)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Vault message section */}
      {will.vaultIpfsHash !== "" && (
        <div style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid var(--border-dim)" }}>
          {canReadVault ? (
            <>
              <button
                onClick={loadVaultMessage}
                disabled={loadingVault}
                style={{
                  background: "var(--amber-glow)", border: "1px solid var(--amber)",
                  borderRadius: "2px", color: "var(--amber)",
                  fontFamily: "var(--font-mono)", fontSize: "0.65rem",
                  letterSpacing: "0.15em", padding: "0.5rem 1rem",
                  cursor: loadingVault ? "not-allowed" : "pointer",
                  opacity: loadingVault ? 0.6 : 1,
                }}
              >
                {loadingVault ? "LOADING..." : vaultOpen ? "HIDE MESSAGE" : "READ VAULT MESSAGE"}
              </button>

              {vaultOpen && vaultText && (
                <div style={{
                  marginTop: "1rem", background: "var(--bg-surface)",
                  border: "1px solid var(--border-dim)", borderRadius: "2px",
                  padding: "1rem",
                }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                    MESSAGE FROM OWNER
                  </p>
                  <p style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.78rem",
                    color: "var(--text-primary)", lineHeight: 1.8,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {vaultText}
                  </p>
                  
                    <a href={`https://gateway.pinata.cloud/ipfs/${will.vaultIpfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--amber)", textDecoration: "none", display: "block", marginTop: "0.75rem" }}
                  >
                    VIEW ON IPFS ↗
                  </a>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ color: "var(--amber)", fontSize: "0.75rem" }}>🔒</span>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                Vault message locked — reveals after will executes
              </p>
            </div>
          )}
        </div>
      )}

      {/* Execution banner */}
      {will.willExecuted && (
        <div style={{
          padding: "0.75rem 1.5rem", background: "var(--green-dim)",
          borderTop: "1px solid var(--green)", display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <span style={{ color: "var(--green)", fontSize: "0.8rem" }}>✓</span>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--green)", letterSpacing: "0.05em" }}>
            Will has been executed. Check your wallet for received assets.
          </p>
        </div>
      )}

      {/* Imminent warning */}
      {!will.willExecuted && will.timeRemaining === 0n && (
        <div style={{
          padding: "0.75rem 1.5rem", background: "var(--amber-glow)",
          borderTop: "1px solid var(--amber)", display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <span style={{ color: "var(--amber)", fontSize: "0.8rem" }}>⚠</span>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--amber)", letterSpacing: "0.05em" }}>
            Inactivity threshold reached. Waiting for Chainlink to trigger execution.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div style={{ padding: "1rem 1.5rem", borderLeft: border ? "1px solid var(--border-dim)" : "none" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: "0.375rem" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}
