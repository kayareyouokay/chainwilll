import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygonAmoy } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "ChainWill",
  projectId: "dc317973995a1aa328fb931e951bc717",
  chains: [polygonAmoy],
  ssr: true,
});
