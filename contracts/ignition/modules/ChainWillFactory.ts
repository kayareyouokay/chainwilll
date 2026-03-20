import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ChainWillFactoryModule = buildModule("ChainWillFactoryModule", (m) => {
  const factory = m.contract("ChainWillFactory", []);
  return { factory };
});

export default ChainWillFactoryModule;
