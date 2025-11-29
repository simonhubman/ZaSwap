import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import "../styles/Header.css";

export function Header() {
  const { chain } = useAccount();
  const chainLabel = chain?.name ?? "Not connected";

  return (
    <header className="header">
      <div className="header-container">
        <div className="brand">
          <div className="brand-mark">ZaSwap</div>
          <div className="brand-copy">
            <span>Encrypted swap desk</span>
            <span className="sep">•</span>
            <span>{chainLabel}</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="badge">FHEVM</div>
          <ConnectButton chainStatus="icon" label="Connect" showBalance={false} />
        </div>
      </div>
    </header>
  );
}
