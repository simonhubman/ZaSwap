// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ConfidentialUSDT} from "./ConfidentialUSDT.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ZaSwap
/// @notice Fixed-rate swap from ETH to cUSDT (1 ETH = 3300 cUSDT, 6 decimals).
/// @dev cUSDT balances remain encrypted; this contract only mints new tokens on swap.
contract ZaSwap is ZamaEthereumConfig {
    event SwapExecuted(address indexed user, uint256 ethIn, uint64 cUsdtOut);
    event EthWithdrawn(address indexed to, uint256 amount);

    uint256 public constant RATE = 3300;
    uint256 private constant TOKEN_DECIMALS = 1e6;
    uint256 private constant WEI_PER_ETH = 1e18;

    address public immutable treasury;
    ConfidentialUSDT public immutable cusdt;
    address private _owner;

    error ZeroInput();
    error AmountTooLarge();
    error InvalidRecipient();
    error NotOwner();

    constructor(address cusdtAddress, address treasuryAddress) {
        if (cusdtAddress == address(0)) revert InvalidRecipient();
        if (treasuryAddress == address(0)) revert InvalidRecipient();
        cusdt = ConfidentialUSDT(cusdtAddress);
        treasury = treasuryAddress;
        _owner = msg.sender;
    }

    function owner() external view returns (address) {
        return _owner;
    }

    /// @notice Preview cUSDT output for a given ETH amount in wei.
    function quote(uint256 ethAmountWei) public pure returns (uint64) {
        if (ethAmountWei == 0) revert ZeroInput();
        uint256 raw = (ethAmountWei * RATE * TOKEN_DECIMALS) / WEI_PER_ETH;
        if (raw > type(uint64).max) revert AmountTooLarge();
        return uint64(raw);
    }

    /// @notice Swap ETH for cUSDT at the fixed 1:3300 rate.
    function swap() external payable returns (uint64 mintedAmount) {
        mintedAmount = quote(msg.value);
        cusdt.mint(msg.sender, mintedAmount);
        emit SwapExecuted(msg.sender, msg.value, mintedAmount);
    }

    /// @notice Withdraw collected ETH to the configured treasury.
    function withdrawETH(uint256 amount) external {
        if (msg.sender != _owner) revert NotOwner();
        if (amount == 0) revert ZeroInput();
        (bool sent, ) = treasury.call{value: amount}("");
        require(sent, "ETH transfer failed");
        emit EthWithdrawn(treasury, amount);
    }
}
