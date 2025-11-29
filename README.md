# ZaSwap — Confidential ETH to cUSDT Swap on FHEVM

ZaSwap is a privacy-first swap that converts ETH to the encrypted stablecoin cUSDT at a fixed 1 ETH = 3300 cUSDT rate. It uses Zama's Fully Homomorphic Encryption Virtual Machine (FHEVM) so balances stay encrypted on-chain and only the user can decrypt their holdings. The repository bundles the smart contracts, Hardhat tooling, and a React-based dapp that connects to Sepolia through viem (reads) and ethers (writes).

## Why ZaSwap
- Private by default: balances remain encrypted end-to-end; users decide when to decrypt.
- Predictable pricing: deterministic 1:3300 swap rate removes slippage and MEV games.
- Censorship-resistant UX: no backend storage or localstorage; everything flows through the chain and the FHE relayer.
- Developer-friendly: Hardhat deploy/tasks/tests, TypeChain typings, and a front-end scaffold wired to RainbowKit + wagmi.
- ABI-driven UI: front-end ABIs come from generated deployments (`deployments/sepolia`) to keep contract and UI in sync.

## Problems We Address
- **Balance confidentiality**: traditional ERC20s expose holdings; FHE keeps cUSDT balances opaque on-chain.
- **Deterministic swaps**: users get a fixed ETH→cUSDT quote without slippage math or price oracles.
- **Simple key management**: FHEVM handles encryption/decryption through relayer/KMS so users never move secrets off wallet.
- **Network readiness**: clear paths for local FHE mock testing and Sepolia deployment, avoiding localhost usage in the live UI.

## Architecture at a Glance
- **Smart contracts**
  - `ConfidentialUSDT.sol`: ERC7984-based cUSDT token that mints encrypted balances with FHE types.
  - Swap contract: fixed-rate ETH→cUSDT flow live on Sepolia (view functions avoid `msg.sender`).
  - `FHECounter.sol`: minimal FHE reference contract used by tasks/tests to validate the toolchain.
- **Off-chain/FHE**
  - Zama FHEVM stack (coprocessors, gateway, KMS) orchestrates encrypted inputs and decryptions.
  - Relayer integration documented in `docs/zama_doc_relayer.md`; FHE contract primitives covered in `docs/zama_llm.md`.
- **Frontend (`home/`)**
  - React + Vite + TypeScript with RainbowKit for wallet connect.
  - Reads via viem, writes via ethers; no Tailwind, no environment variables, and no localstorage.
  - Shows encrypted cUSDT balances and lets the user decrypt on demand (wired to Sepolia, not localhost).

## Tech Stack
- **On-chain**: Solidity 0.8.27, Hardhat + hardhat-deploy, FHEVM Solidity libs, TypeChain, Mocha/Chai, hardhat-gas-reporter, solidity-coverage.
- **Frontend**: React, Vite, wagmi, RainbowKit, viem (reads), ethers (writes), @tanstack/react-query, @zama-fhe/relayer-sdk for encrypted input handling.
- **Tooling**: npm, ESLint/Prettier, ts-node, rimraf. Node.js ≥ 20 is required.

## Repository Layout
```
contracts/         cUSDT token and reference FHE contracts
deploy/            Hardhat deployment scripts
tasks/             CLI tasks for encrypted interactions (counter reference)
test/              Unit/integration tests (mock FHE + Sepolia flow)
docs/              FHEVM + relayer guides
home/              React dapp (no Tailwind, no env vars)
```

## Current Components and Status
- **cUSDT token** (`contracts/ConfidentialUSDT.sol`): live contract for encrypted stablecoin balances.
- **Swap contract**: fixed-rate ETH→cUSDT logic live and deployed to Sepolia with private-key based signing.
- **Reference counter**: `FHECounter` plus tasks/tests validate the FHE toolchain locally and on Sepolia.
- **Frontend shell**: RainbowKit + wagmi wiring and layout scaffolding ready for swap and balance views; contract ABI/config live in `home/src/config`.

## Sepolia Deployments
- cUSDT (`ConfidentialUSDT`): `0xF01fcE58346cBa5b2fb89FE955A14DAd9F3c25F7`
- Swap (`ZaSwap`): `0x9E67482876825E7B709fD06399db0C0320acaB72`
- Reference (`FHECounter`): `0x2909b958096DECe5f46689eD379D962639925917`

## Getting Started
1) Install dependencies  
```bash
npm install               # root (contracts and tooling)
cd home && npm install    # frontend
```

2) Compile and test contracts  
```bash
npm run compile
npm run test              # uses the mock FHE environment
```

3) Run a local FHEVM-ready node and deploy reference contracts  
```bash
npm run chain             # hardhat node
npm run deploy:localhost  # deploys FHECounter via hardhat-deploy
```

4) Deploy to Sepolia (fixed-rate swap + cUSDT)  
- Store secrets with `npx hardhat vars set INFURA_API_KEY` and `npx hardhat vars set MNEMONIC` (current config), or migrate to a `PRIVATE_KEY`-driven deploy flow for production.  
- Deploy: `npm run deploy:sepolia`  
- Verify (once addresses are known): `npm run verify:sepolia`

5) Copy generated ABIs for the frontend  
- After deployment, copy the generated ABI from `deployments/sepolia/<Contract>.json` into TypeScript constants (no JSON imports) under `home/src/config`, keeping the ABI identical to the on-chain build.

6) Run the frontend (Sepolia only; no localhost network)  
```bash
cd home
npm run dev
```
Update `home/src/config/wagmi.ts` with your WalletConnect `projectId` and make sure contract addresses/ABIs point to the latest Sepolia deployments.

## Swap and Balance Flow (intended)
- User connects wallet (RainbowKit) on Sepolia.
- Frontend quotes ETH→cUSDT at 1:3300, calls the swap contract with ethers for state changes.
- cUSDT balances stay encrypted; viem reads the ciphertext, and the relayer decrypts only when the user opts in to view their clear balance.
- No mocks or fake balances; all reads/writes go to live contracts and the FHE relayer.

## Future Roadmap
- Ship the fixed-rate swap contract with deterministic pricing and full test coverage.
- Add deployment script that signs with a private key (no mnemonic) and relies on `INFURA_API_KEY` + `dotenv` for configuration.
- Replace placeholder UI sections with the full swap + balance experience, including encrypted balance display and user-triggered decryption.
- Integrate ABIs from `deployments/sepolia` automatically into the frontend config.
- Expand Hardhat tasks for swap execution and balance decryption, plus end-to-end tests against Sepolia.
- Security hardening: audits, access-control review, and gas profiling for the swap path.

## References
- FHE contract guide: `docs/zama_llm.md`
- Relayer/frontend integration: `docs/zama_doc_relayer.md`
- Zama FHEVM docs: https://docs.zama.ai

## License
BSD-3-Clause-Clear. See `LICENSE` for details.
