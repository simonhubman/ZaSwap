import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { useZamaInstance } from "../hooks/useZamaInstance";
import { CUSDT_ABI, CUSDT_ADDRESS, SWAP_ADDRESS } from "../config/contracts";

type BalancePanelProps = {
  refreshNonce: number;
};

export function BalancePanel({ refreshNonce }: BalancePanelProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: relayerLoading, error: relayerError } = useZamaInstance();

  const [encryptedBalance, setEncryptedBalance] = useState<string>("");
  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  const maskedHandle = useMemo(() => {
    if (!encryptedBalance) return "--";
    if (encryptedBalance === "0x") return "0x0";
    return `${encryptedBalance.slice(0, 10)}…${encryptedBalance.slice(-6)}`;
  }, [encryptedBalance]);

  useEffect(() => {
    let cancelled = false;
    const loadBalance = async () => {
      if (!address || !publicClient) {
        setEncryptedBalance("");
        setDecryptedBalance(null);
        return;
      }
      setLoadingBalance(true);
      setStatus("");
      try {
        const result = await publicClient.readContract({
          address: CUSDT_ADDRESS,
          abi: CUSDT_ABI,
          functionName: "confidentialBalanceOf",
          args: [address],
        });
        if (!cancelled) {
          setEncryptedBalance(result as string);
          setDecryptedBalance(null);
        }
      } catch (error) {
        if (!cancelled) {
          setEncryptedBalance("");
          setStatus("Could not read encrypted balance.");
        }
      } finally {
        if (!cancelled) {
          setLoadingBalance(false);
        }
      }
    };

    loadBalance();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient, refreshNonce]);

  const handleDecrypt = async () => {
    if (!instance) {
      setStatus("Relayer SDK is not ready yet.");
      return;
    }
    if (!address) {
      setStatus("Connect a wallet to decrypt.");
      return;
    }
    if (!encryptedBalance || encryptedBalance === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      setStatus("No balance to decrypt yet.");
      setDecryptedBalance("0");
      return;
    }
    if (!signerPromise) {
      setStatus("Unable to access signer.");
      return;
    }

    try {
      setDecrypting(true);
      setStatus("Generating user decryption request...");
      const signer = await signerPromise;
      const keypair = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "7";
      const contractAddresses = [CUSDT_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const decrypted = await instance.userDecrypt(
        [{ handle: encryptedBalance, contractAddress: CUSDT_ADDRESS }],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimestamp,
        durationDays,
      );

      const rawValue = decrypted[encryptedBalance];
      if (rawValue === undefined) {
        setStatus("Decryption failed. Please retry.");
        return;
      }

      const clear = typeof rawValue === "bigint" ? rawValue : BigInt(rawValue);
      setDecryptedBalance(formatUnits(clear, 6));
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to decrypt balance.");
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Balance</p>
          <h3 className="panel-title">cUSDT encryption</h3>
          <p className="panel-subtitle">Read with viem, decrypt locally via Zama&apos;s relayer SDK.</p>
        </div>
        <div className="tag">On-chain</div>
      </div>

      <div className="balance-block">
        <p className="label">Encrypted balance</p>
        <p className="encrypted-value">{loadingBalance ? "Loading..." : maskedHandle}</p>
        <p className="helper-text">Handle source: cUSDT.confidentialBalanceOf({address ?? "wallet"})</p>
      </div>

      <div className="balance-block">
        <p className="label">Clear balance</p>
        <p className="clear-value">{decryptedBalance ?? "--"}</p>
      </div>

      <button className="secondary-btn" onClick={handleDecrypt} disabled={decrypting || relayerLoading}>
        {decrypting ? "Decrypting..." : "Decrypt balance"}
      </button>

      <div className="footnotes">
        <p className="footnote">
          cUSDT address: {CUSDT_ADDRESS}
          <br />
          Swap contract: {SWAP_ADDRESS}
        </p>
        {relayerError && <p className="error-text">{relayerError}</p>}
        {status && <p className="status-text">{status}</p>}
      </div>
    </div>
  );
}
