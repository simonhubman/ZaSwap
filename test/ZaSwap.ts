import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ethers, fhevm } from "hardhat";
import {
  ConfidentialUSDT,
  ConfidentialUSDT__factory,
  ZaSwap,
  ZaSwap__factory,
} from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  user: HardhatEthersSigner;
};

describe("ZaSwap", function () {
  let signers: Signers;
  let cusdt: ConfidentialUSDT;
  let cusdtAddress: string;
  let swap: ZaSwap;

  before(async function () {
    const [deployer, user] = await ethers.getSigners();
    signers = { deployer, user };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("ZaSwap tests run only in the FHEVM mock environment");
      this.skip();
    }

    const cusdtFactory = (await ethers.getContractFactory(
      "ConfidentialUSDT",
      signers.deployer,
    )) as ConfidentialUSDT__factory;
    cusdt = (await cusdtFactory.deploy()) as ConfidentialUSDT;
    cusdtAddress = await cusdt.getAddress();

    const swapFactory = (await ethers.getContractFactory(
      "ZaSwap",
      signers.deployer,
    )) as ZaSwap__factory;
    swap = (await swapFactory.deploy(cusdtAddress, signers.deployer.address)) as ZaSwap;
  });

  it("swaps 1 ETH for 3300 cUSDT (encrypted)", async function () {
    const tx = await swap.connect(signers.user).swap({ value: ethers.parseEther("1") });
    await tx.wait();

    const encryptedBalance = await cusdt.confidentialBalanceOf(signers.user.address);
    expect(encryptedBalance).to.not.eq(ethers.ZeroHash);

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      cusdtAddress,
      signers.user,
    );

    expect(clearBalance).to.eq(3_300_000_000n);
  });

  it("allows the owner to withdraw collected ETH", async function () {
    const swapValue = ethers.parseEther("0.5");
    await swap.connect(signers.user).swap({ value: swapValue });

    const balanceBefore = await ethers.provider.getBalance(signers.deployer.address);
    const withdrawTx = await swap.connect(signers.deployer).withdrawETH(swapValue);
    const receipt = await withdrawTx.wait();
    const effectiveGasPrice = receipt?.gasPrice ?? withdrawTx.gasPrice ?? withdrawTx.maxFeePerGas ?? 0n;
    const gasSpent = effectiveGasPrice * BigInt(receipt?.gasUsed ?? 0n);
    const balanceAfter = await ethers.provider.getBalance(signers.deployer.address);

    expect(balanceAfter).to.be.closeTo(balanceBefore + swapValue - gasSpent, ethers.parseEther("0.0001"));
  });
});
