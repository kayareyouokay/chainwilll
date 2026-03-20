// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable }        from "@openzeppelin/contracts/utils/Pausable.sol";
import { Ownable }         from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 }          from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 }       from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC721 }         from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { AutomationCompatibleInterface } from
    "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/// @title ChainWill
/// @notice dead man's switch contract for assets
contract ChainWill is
    ReentrancyGuard,
    Pausable,
    Ownable,
    AutomationCompatibleInterface
{
    using SafeERC20 for IERC20;

    // basic limits so gas doesn't explode
    uint256 public constant BASIS_POINTS = 10_000;
    uint256 public constant MAX_BENEFICIARIES = 5;
    uint256 public constant MIN_THRESHOLD = 30 days;

    struct Beneficiary {
        address wallet;
        uint256 allocation;
    }

    struct TokenAsset {
        address token;
        uint256 amount; // 0 = full balance later
    }

    struct NFTAsset {
        address nftContract;
        uint256 tokenId;
        address beneficiary;
    }

    uint256 public lastCheckIn;
    uint256 public inactivityThreshold;
    bool public willExecuted;
    bool public isConfigured;

    address public automationForwarder;

    Beneficiary[] public beneficiaries;
    TokenAsset[] public tokenAssets;
    NFTAsset[] public nftAssets;

    event CheckedIn(address indexed owner, uint256 timestamp);
    event WillConfigured(address indexed owner, uint256 count, uint256 threshold);
    event WillExecuted(address indexed owner, uint256 timestamp);
    event ETHTransferred(address indexed beneficiary, uint256 amount);
    event TokenTransferred(address indexed token, address indexed beneficiary, uint256 amount);
    event NFTTransferred(address indexed nft, uint256 tokenId, address indexed beneficiary);
    event ForwarderUpdated(address indexed forwarder);

    error NotConfigured();
    error AlreadyExecuted();
    error ThresholdNotReached();
    error InvalidBeneficiaryCount();
    error ZeroBeneficiaryAddress();
    error ZeroAllocation();
    error AllocationMismatch(uint256 total);
    error ThresholdTooShort(uint256 provided, uint256 minimum);
    error ETHTransferFailed(address beneficiary);
    error UnauthorizedForwarder(address caller);

    modifier notExecuted() {
        if (willExecuted) revert AlreadyExecuted();
        _;
    }

    modifier configured() {
        if (!isConfigured) revert NotConfigured();
        _;
    }

    constructor(uint256 _inactivityThreshold) Ownable(msg.sender) {
        if (_inactivityThreshold < MIN_THRESHOLD)
            revert ThresholdTooShort(_inactivityThreshold, MIN_THRESHOLD);

        inactivityThreshold = _inactivityThreshold;
        lastCheckIn = block.timestamp;
    }

    receive() external payable {}

    /// set beneficiaries + threshold (basically writing your will)
    function configureWill(
        Beneficiary[] calldata _beneficiaries,
        uint256 _threshold
    )
        external
        onlyOwner
        notExecuted
        whenNotPaused
    {
        if (_threshold < MIN_THRESHOLD)
            revert ThresholdTooShort(_threshold, MIN_THRESHOLD);

        uint256 count = _beneficiaries.length;
        if (count == 0 || count > MAX_BENEFICIARIES)
            revert InvalidBeneficiaryCount();

        uint256 totalAllocation;
        for (uint256 i = 0; i < count; ) {
            if (_beneficiaries[i].wallet == address(0)) revert ZeroBeneficiaryAddress();
            if (_beneficiaries[i].allocation == 0) revert ZeroAllocation();
            totalAllocation += _beneficiaries[i].allocation;
            unchecked { ++i; }
        }

        if (totalAllocation != BASIS_POINTS)
            revert AllocationMismatch(totalAllocation);

        delete beneficiaries;
        for (uint256 i = 0; i < count; ) {
            beneficiaries.push(_beneficiaries[i]);
            unchecked { ++i; }
        }

        inactivityThreshold = _threshold;
        lastCheckIn = block.timestamp; // also acts like a check-in
        isConfigured = true;

        emit WillConfigured(msg.sender, count, _threshold);
    }

    /// add tokens to distribute later
    function setTokenAssets(TokenAsset[] calldata _tokens)
        external
        onlyOwner
        notExecuted
        whenNotPaused
    {
        delete tokenAssets;
        for (uint256 i = 0; i < _tokens.length; ) {
            tokenAssets.push(_tokens[i]);
            unchecked { ++i; }
        }
    }

    /// add NFTs to distribute later
    function setNFTAssets(NFTAsset[] calldata _nfts)
        external
        onlyOwner
        notExecuted
        whenNotPaused
    {
        delete nftAssets;
        for (uint256 i = 0; i < _nfts.length; ) {
            nftAssets.push(_nfts[i]);
            unchecked { ++i; }
        }
    }

    /// optional chainlink forwarder restriction
    function setAutomationForwarder(address _forwarder)
        external
        onlyOwner
    {
        automationForwarder = _forwarder;
        emit ForwarderUpdated(_forwarder);
    }

    /// owner proves they're alive
    function checkIn()
        external
        onlyOwner
        notExecuted
        whenNotPaused
    {
        lastCheckIn = block.timestamp;
        emit CheckedIn(msg.sender, block.timestamp);
    }

    /// chainlink checks if execution should happen
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (
            isConfigured &&
            !willExecuted &&
            !paused() &&
            block.timestamp >= lastCheckIn + inactivityThreshold
        );
        performData = "";
    }

    /// executes the will if inactive long enough
    function performUpkeep(bytes calldata)
        external
        override
        nonReentrant
        whenNotPaused
        configured
        notExecuted
    {
        if (automationForwarder != address(0) && msg.sender != automationForwarder)
            revert UnauthorizedForwarder(msg.sender);

        if (block.timestamp < lastCheckIn + inactivityThreshold)
            revert ThresholdNotReached();

        willExecuted = true;
        emit WillExecuted(owner(), block.timestamp);

        _distributeETH();
        _distributeTokens();
        _distributeNFTs();
    }

    /// splits ETH based on allocation
    function _distributeETH() internal {
        uint256 totalETH = address(this).balance;
        if (totalETH == 0) return;

        uint256 len = beneficiaries.length;
        for (uint256 i = 0; i < len; ) {
            uint256 share = (totalETH * beneficiaries[i].allocation) / BASIS_POINTS;

            if (share > 0) {
                (bool success, ) = beneficiaries[i].wallet.call{ value: share }("");
                if (!success) revert ETHTransferFailed(beneficiaries[i].wallet);

                emit ETHTransferred(beneficiaries[i].wallet, share);
            }
            unchecked { ++i; }
        }
    }

    /// distributes ERC20 tokens
    function _distributeTokens() internal {
        uint256 tokenCount = tokenAssets.length;
        if (tokenCount == 0) return;

        uint256 benCount = beneficiaries.length;

        for (uint256 t = 0; t < tokenCount; ) {
            IERC20 token = IERC20(tokenAssets[t].token);

            uint256 total = tokenAssets[t].amount == 0
                ? token.balanceOf(address(this))
                : tokenAssets[t].amount;

            if (total > 0) {
                for (uint256 b = 0; b < benCount; ) {
                    uint256 share = (total * beneficiaries[b].allocation) / BASIS_POINTS;

                    if (share > 0) {
                        token.safeTransfer(beneficiaries[b].wallet, share);

                        emit TokenTransferred(
                            tokenAssets[t].token,
                            beneficiaries[b].wallet,
                            share
                        );
                    }
                    unchecked { ++b; }
                }
            }
            unchecked { ++t; }
        }
    }

    /// transfers NFTs (1 NFT -> 1 beneficiary)
    function _distributeNFTs() internal {
        uint256 nftCount = nftAssets.length;
        if (nftCount == 0) return;

        for (uint256 i = 0; i < nftCount; ) {
            IERC721(nftAssets[i].nftContract).safeTransferFrom(
                address(this),
                nftAssets[i].beneficiary,
                nftAssets[i].tokenId
            );

            emit NFTTransferred(
                nftAssets[i].nftContract,
                nftAssets[i].tokenId,
                nftAssets[i].beneficiary
            );

            unchecked { ++i; }
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// emergency withdraw if things go wrong
    function emergencyWithdrawETH()
        external
        onlyOwner
        whenPaused
        nonReentrant
    {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{ value: balance }("");
        require(success, "ETH withdrawal failed");
    }

    function emergencyWithdrawToken(address _token)
        external
        onlyOwner
        whenPaused
        nonReentrant
    {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(owner(), balance);
    }

    function timeUntilExecution() external view returns (uint256) {
        uint256 deadline = lastCheckIn + inactivityThreshold;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    function getBeneficiaries() external view returns (Beneficiary[] memory) {
        return beneficiaries;
    }

    function getTokenAssets() external view returns (TokenAsset[] memory) {
        return tokenAssets;
    }

    function getNFTAssets() external view returns (NFTAsset[] memory) {
        return nftAssets;
    }

    function getWillStatus() external view returns (
        bool,
        bool,
        bool,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    ) {
        uint256 deadline = lastCheckIn + inactivityThreshold;
        uint256 remaining = block.timestamp >= deadline ? 0 : deadline - block.timestamp;

        return (
            isConfigured,
            willExecuted,
            paused(),
            lastCheckIn,
            inactivityThreshold,
            remaining,
            address(this).balance,
            beneficiaries.length
        );
    }

    /// needed so contract can receive NFTs
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}