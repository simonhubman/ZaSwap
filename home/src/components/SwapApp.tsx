import { useState } from "react";
import "../App.css";
import { Header } from "./Header";
import { SwapPanel } from "./SwapPanel";
import { BalancePanel } from "./BalancePanel";

export function SwapApp() {
  const [refreshNonce, setRefreshNonce] = useState(0);

  const handleSwapComplete = () => {
    setRefreshNonce((prev) => prev + 1);
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="app-content">
        <section className="hero">
          <div className="hero-pill">Encrypted swap · Sepolia</div>
          <h1 className="hero-title">Swap ETH to cUSDT with private balances</h1>
          <p className="hero-subtitle">
            Fixed 1:3300 pricing, cUSDT balances remain encrypted on-chain, and decryption stays in your control.
          </p>
          <div className="hero-grid">
            <div className="stat-card">
              <div className="stat-label">Fixed rate</div>
              <div className="stat-value">1 ETH → 3300 cUSDT</div>
              <p className="stat-hint">Deterministic output, no slippage or price oracles required.</p>
            </div>
            <div className="stat-card">
              <div className="stat-label">Zama FHEVM</div>
              <div className="stat-value">Private balances</div>
              <p className="stat-hint">Encrypted balances with client-side decryption via the relayer SDK.</p>
            </div>
            <div className="stat-card">
              <div className="stat-label">Chain</div>
              <div className="stat-value">Sepolia</div>
              <p className="stat-hint">Connect a Sepolia wallet; no localhost endpoints are used.</p>
            </div>
          </div>
        </section>

        <section className="panel-grid">
          <SwapPanel onSwapComplete={handleSwapComplete} />
          <BalancePanel refreshNonce={refreshNonce} />
        </section>
      </main>
    </div>
  );
}
