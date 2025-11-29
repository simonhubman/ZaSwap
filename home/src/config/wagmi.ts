import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "ZaSwap",
  projectId: "b48c1f47a4d24f2086d37bf2bd6719ad",
  chains: [sepolia],
  ssr: false,
});
