import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "2rem", gap: "3rem",
    }}>
      {/* Hero */}
      <div style={{ textAlign: "center", maxWidth: "680px" }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.65rem",
          letterSpacing: "0.3em", color: "var(--amber)", marginBottom: "1.5rem",
        }}>
          POLYGON AMOY · TESTNET
        </p>
        <h1 style={{
          fontFamily: "var(--font-serif)", fontSize: "clamp(2.5rem, 7vw, 5rem)",
          color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.1,
          marginBottom: "1.5rem",
        }}>
          Your assets.<br />Your terms.<br />No intermediaries.
        </h1>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.85rem",
          color: "var(--text-secondary)", lineHeight: 1.9, letterSpacing: "0.03em",
          maxWidth: "480px", margin: "0 auto",
        }}>
          ChainWill is a smart contract dead man's switch.
          Configure your beneficiaries once. Check in to stay active.
          Stop checking in — and the contract executes your will automatically.
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block", padding: "1rem 2.5rem",
            background: "var(--amber-glow)", border: "1px solid var(--amber)",
            borderRadius: "2px", color: "var(--amber)",
            fontFamily: "var(--font-mono)", fontSize: "0.75rem",
            fontWeight: 500, letterSpacing: "0.2em", textDecoration: "none",
          }}
        >
          OWNER DASHBOARD
        </Link>
        <Link
          href="/beneficiary"
          style={{
            display: "inline-block", padding: "1rem 2.5rem",
            background: "var(--bg-card)", border: "1px solid var(--border-mid)",
            borderRadius: "2px", color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)", fontSize: "0.75rem",
            fontWeight: 500, letterSpacing: "0.2em", textDecoration: "none",
          }}
        >
          BENEFICIARY PORTAL
        </Link>
      </div>

      {/* Feature grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "1rem",
        width: "100%",
        maxWidth: "880px",
      }}>
        {[
          ["DEAD MAN'S SWITCH", "Auto-executes on inactivity"],
          ["UP TO 5 HEIRS",     "ETH, ERC-20, and NFTs"],
          ["CHAINLINK KEEPER",  "Trust-minimized automation"],
          ["OPEN SOURCE",       "Verified on Sourcify"],
        ].map(([title, desc]) => (
          <div key={title} style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-dim)",
            borderRadius: "2px",
            padding: "1.25rem 1.5rem",
          }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--amber)", marginBottom: "0.5rem" }}>
              {title}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}