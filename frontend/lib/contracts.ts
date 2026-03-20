// ─────────────────────────────────────────────────────────────────────────────
// Deployed addresses — Sepolia
// ─────────────────────────────────────────────────────────────────────────────

export const FACTORY_ADDRESS =
  "0x66Cc14AbdBa43fE10333909bF1A927Cf21A7C253" as const;

// Individual will address is looked up per-wallet via the factory.
// This constant is only used as a fallback type reference.
export const CHAINWILL_ABI = [
  {
    name: "getWillStatus",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "_isConfigured",        type: "bool"    },
      { name: "_willExecuted",        type: "bool"    },
      { name: "_isPaused",            type: "bool"    },
      { name: "_lastCheckIn",         type: "uint256" },
      { name: "_inactivityThreshold", type: "uint256" },
      { name: "_timeUntilExecution",  type: "uint256" },
      { name: "_ethBalance",          type: "uint256" },
      { name: "_beneficiaryCount",    type: "uint256" },
    ],
  },
  {
    name: "getBeneficiaries",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "wallet",     type: "address" },
          { name: "allocation", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "timeUntilExecution",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isConfigured",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "willExecuted",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "lastCheckIn",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "inactivityThreshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "configureWill",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_beneficiaries",
        type: "tuple[]",
        components: [
          { name: "wallet",     type: "address" },
          { name: "allocation", type: "uint256" },
        ],
      },
      { name: "_threshold", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "checkIn",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "pause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "unpause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "emergencyWithdrawETH",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "resetWill",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  {
    name: "CheckedIn",
    type: "event",
    inputs: [
      { name: "owner",     type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "WillExecuted",
    type: "event",
    inputs: [
      { name: "owner",     type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export const FACTORY_ABI = [
  {
    name: "createWill",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_inactivityThreshold", type: "uint256" }],
    outputs: [{ name: "will", type: "address" }],
  },
  {
    name: "getWill",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_owner", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "hasWill",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_owner", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "totalWills",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "WillCreated",
    type: "event",
    inputs: [
      { name: "owner",     type: "address", indexed: true },
      { name: "will",      type: "address", indexed: true },
      { name: "threshold", type: "uint256", indexed: false },
    ],
  },
  {
    name: "WillCreated",
    type: "event",
    inputs: [
      { name: "owner",     type: "address", indexed: true },
      { name: "will",      type: "address", indexed: true },
      { name: "threshold", type: "uint256", indexed: false },
    ],
  },
  {
    name: "deleteWill",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;
