import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const cusdt = await get("ConfidentialUSDT");

  const swap = await deploy("ZaSwap", {
    from: deployer,
    args: [cusdt.address, deployer],
    log: true,
  });

  console.log(`ZaSwap contract: ${swap.address} (cUSDT: ${cusdt.address})`);
};

export default func;
func.id = "deploy_zaswap";
func.tags = ["ZaSwap"];
