import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedCUSDT = await deploy("ConfidentialUSDT", {
    from: deployer,
    log: true,
  });

  console.log(`ConfidentialUSDT contract: ${deployedCUSDT.address}`);
};

export default func;
func.id = "deploy_confidentialUSDT";
func.tags = ["ConfidentialUSDT"];
