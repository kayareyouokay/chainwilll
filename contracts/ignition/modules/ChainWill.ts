import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// 90 days in seconds — production default threshold
// Override with --parameters flag at deploy time if needed
const NINETY_DAYS = 90n * 24n * 60n * 60n;

const ChainWillModule = buildModule("ChainWillModule", (m) => {
  // m.getParameter allows overriding at deploy time:
  // npx hardhat ignition deploy ... --parameters '{"inactivityThreshold":"2592000"}'
  const inactivityThreshold = m.getParameter(
    "inactivityThreshold",
    NINETY_DAYS
  );

  const chainWill = m.contract("ChainWill", [inactivityThreshold]);

  return { chainWill };
});

export default ChainWillModule;
