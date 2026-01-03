// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.18;

/**
 * @title Roles Library
 * @notice Role constants for Yearn V3 Vault
 * @dev These match the enum Roles defined in Vault.vy (lines 185-199)
 */
library Roles {
    // Can add strategies to the vault
    uint256 public constant ADD_STRATEGY_MANAGER = 1;

    // Can remove strategies from the vault
    uint256 public constant REVOKE_STRATEGY_MANAGER = 2;

    // Can force remove a strategy causing a loss
    uint256 public constant FORCE_REVOKE_MANAGER = 4;

    // Can set the accountant that assess fees
    uint256 public constant ACCOUNTANT_MANAGER = 8;

    // Can set the default withdrawal queue
    uint256 public constant QUEUE_MANAGER = 16;

    // Calls report for strategies
    uint256 public constant REPORTING_MANAGER = 32;

    // Adds and removes debt from strategies
    uint256 public constant DEBT_MANAGER = 64;

    // Can set the max debt for a strategy
    uint256 public constant MAX_DEBT_MANAGER = 128;

    // Sets deposit limit and module for the vault
    uint256 public constant DEPOSIT_LIMIT_MANAGER = 256;

    // Sets the withdraw limit module
    uint256 public constant WITHDRAW_LIMIT_MANAGER = 512;

    // Sets the minimum total idle the vault should keep
    uint256 public constant MINIMUM_IDLE_MANAGER = 1024;

    // Sets the profit_max_unlock_time
    uint256 public constant PROFIT_UNLOCK_MANAGER = 2048;

    // Can purchase bad debt from the vault
    uint256 public constant DEBT_PURCHASER = 4096;

    // Can shutdown vault in an emergency
    uint256 public constant EMERGENCY_MANAGER = 8192;

    // All roles combined (bitwise OR of all above)
    uint256 public constant ALL = 16383; // 2^14 - 1
}
