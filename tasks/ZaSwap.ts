import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:swap:address", "Prints deployed swap + cUSDT addresses").setAction(async (_args: TaskArguments, hre) => {
  const swap = await hre.deployments.get("ZaSwap");
  const cusdt = await hre.deployments.get("ConfidentialUSDT");
  console.log(`ZaSwap: ${swap.address}`);
  console.log(`cUSDT : ${cusdt.address}`);
});

task("task:swap:quote", "Preview cUSDT output for an ETH amount in ether")
  .addParam("eth", "ETH amount, in ether units")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments } = hre;
    const swap = await deployments.get("ZaSwap");
    const contract = await ethers.getContractAt("ZaSwap", swap.address);
    const weiValue = ethers.parseEther(args.eth);
    const quoted = await contract.quote(weiValue);
    console.log(`${args.eth} ETH -> ${quoted.toString()} cUSDT`);
  });

task("task:swap:execute", "Swap ETH for cUSDT using ZaSwap")
  .addParam("eth", "ETH amount, in ether units")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments } = hre;
    const swap = await deployments.get("ZaSwap");
    const contract = await ethers.getContractAt("ZaSwap", swap.address);
    const [signer] = await ethers.getSigners();

    const weiValue = ethers.parseEther(args.eth);
    const tx = await contract.connect(signer).swap({ value: weiValue });
    console.log(`Swap sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Swap confirmed. status=${receipt?.status}`);
  });

task("task:cusdt:decrypt-balance", "Decrypt a cUSDT encrypted balance")
  .addOptionalParam("address", "Address to decrypt balance for (defaults to signer[0])")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const cusdtDeployment = await deployments.get("ConfidentialUSDT");
    const cusdt = await ethers.getContractAt("ConfidentialUSDT", cusdtDeployment.address);

    const [signer] = await ethers.getSigners();
    const target = args.address ?? signer.address;

    const encrypted = await cusdt.confidentialBalanceOf(target);
    if (encrypted === ethers.ZeroHash) {
      console.log(`Encrypted balance for ${target}: ${encrypted}`);
      console.log("Clear balance: 0");
      return;
    }

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encrypted,
      cusdtDeployment.address,
      signer,
    );
    console.log(`Encrypted balance for ${target}: ${encrypted}`);
    console.log(`Clear balance: ${clearBalance.toString()}`);
  });
