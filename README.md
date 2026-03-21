# ChainWill

> On-chain inheritance. No lawyers. No intermediaries. No single point of failure.

ChainWill is a smart contract dead man's switch. Configure your beneficiaries, check in periodically to prove you're alive, and leave a message for the people you care about. If you go inactive, Chainlink Automation triggers your will automatically — distributing your POL, ERC-20 tokens, and NFTs exactly as you specified.

Live demo: **https://chainwill-orpin.vercel.app**

---

## The problem

When a crypto wallet owner dies or becomes incapacitated, their assets are permanently locked. There's no password recovery, no next of kin process, no legal mechanism that works with private keys. Billions in crypto has already been lost this way.

## The solution

ChainWill turns your wallet into a dead man's switch:

1. Deploy your personal will contract via the factory
2. Configure up to 5 beneficiaries with percentage allocations
3. Write a message to your beneficiaries — stored on IPFS, hash on-chain
4. Register NFTs to transfer on execution
5. Check in periodically — one transaction proves you're alive
6. Stop checking in for your defined threshold (e.g. 90 days)
7. Chainlink Automation detects inactivity and triggers execution
8. Assets distributed, message unlocked, NFTs transferred — automatically

---

## Architecture
```
ChainWillFactory (0xd2585f2000eC85744ECD811e892d9C2f136Ca859)
└── createWill(threshold)  — deploys a personal ChainWill, transfers ownership to caller
└── deleteWill()           — removes registry mapping so wallet can redeploy

ChainWill (one per wallet)
├── configureWill(beneficiaries[], threshold) — set heirs and inactivity period
├── checkIn()                                 — reset the countdown timer
├── setTokenAssets(tokens[])                  — register ERC-20s for distribution
├── setNFTAssets(nfts[])                      — register NFTs with per-beneficiary assignment
├── setVaultMessage(ipfsHash, private)        — store message CID on-chain
├── checkUpkeep()   → view, polled by Chainlink off-chain every block
├── performUpkeep() → distributes POL + ERC-20 + NFTs on inactivity
├── pause() / unpause()                       — emergency freeze
├── emergencyWithdrawETH()                    — recover funds when paused
└── resetWill()                               — wipe config, start fresh
```

---

## Features

**Owner dashboard**
- Deploy a personal will contract tied to your wallet
- Configure up to 5 beneficiaries with % allocations (must sum to 100%)
- Live countdown clock showing time until execution — freezes when paused
- One-click check-in to reset the inactivity timer
- Deposit POL directly into the will contract
- On-chain address validation when adding beneficiaries
- View currently registered beneficiaries
- Memory vault — write a message stored on IPFS, revealed to beneficiaries on execution
- NFT vault — register NFTs with direct beneficiary assignment
- Danger zone: pause, emergency withdraw, reset, delete

**Beneficiary portal**
- Connect any wallet to scan all ChainWill contracts
- See every will you're named in with your % allocation and POL share
- View NFTs assigned to you
- Read vault message — locked until execution if owner set it private
- Live status: active, paused, executed, imminent

**Security model**
- `ReentrancyGuard` on all external-call functions
- CEI (Checks-Effects-Interactions) pattern in `performUpkeep()`
- One-shot execution — `willExecuted` flag prevents double execution
- Basis point allocations — integer math, sums to exactly 10,000
- Low-level `call()` for ETH — compatible with smart contract wallets
- `SafeERC20` for token transfers — handles non-standard tokens
- `Pausable` emergency stop — owner can freeze at any time
- Custom errors throughout (EIP-838) — cheaper than revert strings
- Optional Chainlink forwarder guard — restricts `performUpkeep` to Chainlink only

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Smart contracts | Solidity ^0.8.28 |
| Development | Hardhat v3 (ESM-first) |
| Testing | Node.js built-in `node:test` — 42 tests |
| Deployment | Hardhat Ignition |
| Security | OpenZeppelin v5 (ReentrancyGuard, Pausable, Ownable, SafeERC20) |
| Automation | Chainlink Automation (AutomationCompatibleInterface) |
| Storage | IPFS via Pinata (vault messages) |
| Frontend | Next.js 16, React 19, App Router |
| Wallet | wagmi v2, viem v2, RainbowKit v2 |
| Styling | TailwindCSS v4 |
| Network | Polygon Amoy testnet |
| Hosting | Vercel |

---

## Deployments

| Contract | Network | Address |
|----------|---------|---------|
| ChainWillFactory | Polygon Amoy | `0xd2585f2000eC85744ECD811e892d9C2f136Ca859` |

Verified on Sourcify: https://sourcify.dev/server/repo-ui/80002/0xd2585f2000eC85744ECD811e892d9C2f136Ca859

---

## Local development

### Prerequisites

- Node.js >= 22
- Git
- Pinata account (free) for IPFS vault messages

### Clone
```bash
git clone https://github.com/kayareyouokay/chainwilll
cd chainwilll
```

### Contracts
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # add your Pinata JWT
npm run dev
```

Open http://localhost:3000

### Environment variables
```bash
# frontend/.env.local
PINATA_JWT=your_pinata_jwt_here
```

### Deploy contracts to Polygon Amoy
```bash
cd contracts

# Set credentials in Hardhat keystore
npx hardhat keystore set POLYGON_AMOY_RPC_URL
npx hardhat keystore set POLYGON_PRIVATE_KEY
npx hardhat keystore set POLYGONSCAN_API_KEY

# Deploy factory
npx hardhat ignition deploy ignition/modules/ChainWillFactory.ts --network polygonAmoy

# Verify
npx hardhat verify --network polygonAmoy <FACTORY_ADDRESS>
```

### Deploy frontend
```bash
cd frontend
npx vercel env add PINATA_JWT production
npx vercel --prod
```

---

## Test coverage
```
42 passing

deployment          5 tests — constructor validation, initial state
configureWill       8 tests — beneficiary validation, allocation math, replacement
checkIn             3 tests — timer reset, access control
checkUpkeep         5 tests — all trigger conditions
ETH inheritance     5 tests — distribution math, one-shot guard, edge cases
timeUntilExecution  2 tests — countdown math
emergency controls  7 tests — pause, withdraw, reset, access control
getWillStatus       2 tests — view helper correctness
memory vault        5 tests — set/update message, privacy flag, access control
```

---

## How it works
```
Owner deploys will
       │
       ▼
Owner configures beneficiaries + threshold + vault message + NFTs
       │
       ▼
Owner checks in periodically ◄──────────────────┐
       │                                         │
       ▼                                         │
Chainlink polls checkUpkeep() every block        │
       │                                         │
       ├── owner active? ──────────────────────── ┘
       │
       └── inactive > threshold?
               │
               ▼
       performUpkeep() called on-chain
               │
               ▼
       willExecuted = true (CEI pattern)
               │
       ┌───────┼───────────┬──────────────┐
       ▼       ▼           ▼              ▼
    POL      ERC-20       NFTs        Vault msg
   split     split     transferred    unlocked
```

---

## Roadmap

- [x] Memory vault — text messages stored on IPFS, revealed on execution
- [x] NFT vault — direct NFT assignment to specific beneficiaries
- [x] Beneficiary portal — scan all wills, view allocations and vault contents
- [ ] Guardian system — trusted contacts who can delay execution during a grace period
- [ ] Single keeper contract — one Chainlink upkeep monitors all wills
- [ ] ERC-20 approval flow in dashboard UI
- [ ] Mainnet deployment

---

## License

MIT
