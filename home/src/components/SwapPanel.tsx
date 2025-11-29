import { useEffect, useMemo, useState } from "react";
import { Contract, ethers } from "ethers";
import { formatUnits, parseEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { CUSDT_ADDRESS, SWAP_ABI, SWAP_ADDRESS } from "../config/contracts";

type SwapPanelProps = {
  onSwapComplete: () => void;
};

export function SwapPanel({ onSwapComplete }: SwapPanelProps) {
  const { chain } = useAccount();
  const signerPromise = useEthersSigner();
  const publicClient = usePublicClient();

  const [ethAmount, setEthAmount] = useState<string>("0.1");
  const [quotedOut, setQuotedOut] = useState<bigint | null>(null);
  const [quoteError, setQuoteError] = useState<string>("");
  const [swapStatus, setSwapStatus] = useState<string>("");
  const [isSwapping, setIsSwapping] = useState(false);

  const isOnSepolia = chain?.name?.toLowerCase().includes("sepolia") ?? false;

  const formattedQuote = useMemo(() => {
    if (quotedOut === null) return "--";
    return `${formatUnits(quotedOut, 6)} cUSDT`;
  }, [quotedOut]);

  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      if (!publicClient) return;
      if (!ethAmount || Number(ethAmount) <= 0) {
        setQuotedOut(null);
        return;
      }

      try {
        setQuoteError("");
        const wei = parseEther(ethAmount);
        const result = await publicClient.readContract({
          address: SWAP_ADDRESS,
          abi: SWAP_ABI,
          functionName: "quote",
          args: [wei],
        });
        if (!cancelled) {
          setQuotedOut(result as bigint);
        }
      } catch (error) {
        if (!cancelled) {
          setQuotedOut(null);
          setQuoteError("Unable to fetch quote for this amount.");
        }
      }
    };

    fetchQuote();
    return () => {
      cancelled = true;
    };
  }, [ethAmount, publicClient]);

  const handleSwap = async () => {
    if (!signerPromise) {
      setSwapStatus("Connect a wallet to swap.");
      return;
    }
    if (!ethAmount || Number(ethAmount) <= 0) {
      setSwapStatus("Enter an ETH amount greater than zero.");
      return;
    }

    try {
      setSwapStatus("");
      setIsSwapping(true);
      const signer = await signerPromise;
      let value: bigint;
      try {
        value = ethers.parseEther(ethAmount);
      } catch (err) {
        setSwapStatus("Enter a valid ETH amount.");
        return;
      }
      const contract = new Contract(SWAP_ADDRESS, SWAP_ABI, signer);

      const tx = await contract.swap({ value });
      setSwapStatus(`Swapping... tx: ${tx.hash}`);
      const receipt = await tx.wait();
      setSwapStatus(`Swap confirmed in block ${receipt?.blockNumber ?? ""}`);

      onSwapComplete();
    } catch (error) {
      setSwapStatus(
        error instanceof Error ? error.message : "Swap failed. Check network and balances.",
      );
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Swap</p>
          <h3 className="panel-title">ETH → cUSDT</h3>
          <p className="panel-subtitle">Fixed 1:3300 rate. cUSDT has 6 decimals.</p>
        </div>
        <div className="tag">Sepolia</div>
      </div>

      <div className="input-group">
        <label htmlFor="ethAmount">ETH amount</label>
        <div className="input-row">
          <input
            id="ethAmount"
            type="number"
            min="0"
            step="0.0001"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            placeholder="0.00"
          />
          <span className="input-hint">ETH</span>
        </div>
      </div>

      <div className="quote-row">
        <div>
          <p className="label">You will receive</p>
          <p className="quote">{formattedQuote}</p>
          {quoteError && <p className="error-text">{quoteError}</p>}
        </div>
        <div className="pill">Rate locked</div>
      </div>

      <div className="helper-row">
        <div className="helper-text">Token: cUSDT ({CUSDT_ADDRESS})</div>
        <div className="helper-text">Contract: {SWAP_ADDRESS}</div>
      </div>

      <button className="primary-btn" onClick={handleSwap} disabled={isSwapping || !isOnSepolia}>
        {isSwapping ? "Swapping..." : "Swap now"}
      </button>

      {!isOnSepolia && (
        <p className="warning-text">Connect to Sepolia to execute swaps.</p>
      )}

      <p className="status-text">{swapStatus}</p>
    </div>
  );
}
