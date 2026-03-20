// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ChainWill } from "./ChainWill.sol";

/// @title ChainWillFactory
/// @notice Simple factory to deploy 1 will per user and keep track of them
contract ChainWillFactory {

    // fired when someone creates their will
    event WillCreated(address indexed owner, address indexed will, uint256 threshold);

    // basic errors
    error WillAlreadyExists(address existing);
    error NoWillFound();

    // user => their will contract
    mapping(address => address) public wills;

    // list of all deployed wills (useful for frontend later)
    address[] public allWills;

    /// deploy a new will for caller
    function createWill(uint256 _inactivityThreshold)
        external
        returns (address will)
    {
        // don't allow multiple wills per wallet
        if (wills[msg.sender] != address(0)) {
            revert WillAlreadyExists(wills[msg.sender]);
        }

        // deploy will (factory is temporary owner here)
        ChainWill newWill = new ChainWill(_inactivityThreshold);

        // give ownership to actual user
        newWill.transferOwnership(msg.sender);

        // store it
        wills[msg.sender] = address(newWill);
        allWills.push(address(newWill));

        emit WillCreated(msg.sender, address(newWill), _inactivityThreshold);

        return address(newWill);
    }

    /// get will address of a user
    function getWill(address _owner) external view returns (address) {
        return wills[_owner];
    }

    /// check if user already made a will
    function hasWill(address _owner) external view returns (bool) {
        return wills[_owner] != address(0);
    }

    /// total wills deployed
    function totalWills() external view returns (uint256) {
        return allWills.length;
    }

    /// deletes a will
    function deleteWill() external {
    if (wills[msg.sender] == address(0)) revert NoWillFound();
    delete wills[msg.sender];
}
}