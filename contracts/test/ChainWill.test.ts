import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import hre from "hardhat";
import { parseEther, getAddress, zeroAddress } from "viem";

// ─── Hardhat v3: all HRE extensions live on the network connection ────────────
// hre.viem and hre.network.networkHelpers are only available after connect()
type NetworkConnection = Awaited<ReturnType<typeof hre.network.connect>>;
let network: NetworkConnection;

const DAY         = 86_400n;
const THIRTY_DAYS = DAY * 30n;

type BeneficiaryStruct = { wallet: `0x${string}`; allocation: bigint };

function twoBeneficiaries(a: `0x${string}`, b: `0x${string}`): BeneficiaryStruct[] {
  return [
    { wallet: a, allocation: 5_000n },
    { wallet: b, allocation: 5_000n },
  ];
}

async function deployChainWill(thresholdSeconds = THIRTY_DAYS) {
  const [owner, alice, bob, carol] = await network.viem.getWalletClients();
  const publicClient = await network.viem.getPublicClient();
  const contract = await network.viem.deployContract("ChainWill", [thresholdSeconds]);
  return { contract, owner, alice, bob, carol, publicClient };
}

describe("ChainWill", () => {

  before(async () => {
    network = await hre.network.connect();
  });

  // Deployment

  describe("deployment", () => {
    it("sets owner correctly", async () => {
      const { contract, owner } = await deployChainWill();
      const contractOwner = await contract.read.owner();
      assert.equal(getAddress(contractOwner), getAddress(owner.account.address));
    });

    it("stores inactivity threshold", async () => {
      const { contract } = await deployChainWill(THIRTY_DAYS);
      const threshold = await contract.read.inactivityThreshold();
      assert.equal(threshold, THIRTY_DAYS);
    });

    it("sets lastCheckIn to deployment timestamp", async () => {
      const { contract, publicClient } = await deployChainWill();
      const block = await publicClient.getBlock();
      const lastCheckIn = await contract.read.lastCheckIn();
      assert.ok(lastCheckIn >= block.timestamp - 2n && lastCheckIn <= block.timestamp + 2n);
    });

    it("reverts if threshold below 30 days", async () => {
      await assert.rejects(
        () => network.viem.deployContract("ChainWill", [DAY * 29n]),
        /ThresholdTooShort/
      );
    });

    it("isConfigured is false on deployment", async () => {
      const { contract } = await deployChainWill();
      assert.equal(await contract.read.isConfigured(), false);
    });
  });

  // configureWill

  describe("configureWill", () => {
    it("configures beneficiaries and sets isConfigured", async () => {
      const { contract, alice, bob } = await deployChainWill();
      await contract.write.configureWill([
        twoBeneficiaries(alice.account.address, bob.account.address),
        THIRTY_DAYS,
      ]);
      assert.equal(await contract.read.isConfigured(), true);
    });

    it("stores beneficiaries correctly", async () => {
      const { contract, alice, bob } = await deployChainWill();
      await contract.write.configureWill([
        twoBeneficiaries(alice.account.address, bob.account.address),
        THIRTY_DAYS,
      ]);
      const bens = await contract.read.getBeneficiaries();
      assert.equal(bens.length, 2);
      assert.equal(getAddress(bens[0].wallet), getAddress(alice.account.address));
      assert.equal(bens[0].allocation, 5_000n);
    });

    it("emits WillConfigured event", async () => {
      const { contract, alice, bob, publicClient } = await deployChainWill();
      const hash = await contract.write.configureWill([
        twoBeneficiaries(alice.account.address, bob.account.address),
        THIRTY_DAYS,
      ]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assert.ok(receipt.logs.length > 0);
    });

    it("reverts with non-owner caller", async () => {
      const { contract, alice, bob } = await deployChainWill();
      const aliceContract = await network.viem.getContractAt(
        "ChainWill",
        contract.address,
        { client: { wallet: alice } }
      );
      await assert.rejects(
        () => aliceContract.write.configureWill([
          twoBeneficiaries(alice.account.address, bob.account.address),
          THIRTY_DAYS,
        ]),
        /OwnableUnauthorizedAccount/
      );
    });

    it("reverts when allocations do not sum to 10 000", async () => {
      const { contract, alice, bob } = await deployChainWill();
      await assert.rejects(
        () => contract.write.configureWill([
          [
            { wallet: alice.account.address, allocation: 4_000n },
            { wallet: bob.account.address,   allocation: 4_000n },
          ],
          THIRTY_DAYS,
        ]),
        /AllocationMismatch/
      );
    });

    it("reverts with zero address beneficiary", async () => {
      const { contract, alice } = await deployChainWill();
      await assert.rejects(
        () => contract.write.configureWill([
          [
            { wallet: alice.account.address, allocation: 5_000n },
            { wallet: zeroAddress,           allocation: 5_000n },
          ],
          THIRTY_DAYS,
        ]),
        /ZeroBeneficiaryAddress/
      );
    });

    it("reverts with more than 5 beneficiaries", async () => {
      const { contract, alice } = await deployChainWill();
      const sixBens: BeneficiaryStruct[] = Array(6).fill({
        wallet: alice.account.address,
        allocation: 1_000n,
      });
      await assert.rejects(
        () => contract.write.configureWill([sixBens, THIRTY_DAYS]),
        /InvalidBeneficiaryCount/
      );
    });

    it("replaces previous configuration on second call", async () => {
      const { contract, alice, bob, carol } = await deployChainWill();
      await contract.write.configureWill([
        twoBeneficiaries(alice.account.address, bob.account.address),
        THIRTY_DAYS,
      ]);
      await contract.write.configureWill([
        [{ wallet: carol.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      const bens = await contract.read.getBeneficiaries();
      assert.equal(bens.length, 1);
      assert.equal(getAddress(bens[0].wallet), getAddress(carol.account.address));
    });
  });

  // checkIn

  describe("checkIn", () => {
    it("updates lastCheckIn to current timestamp", async () => {
      const { contract, alice, publicClient } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(DAY * 10n));
      await contract.write.checkIn();
      const block = await publicClient.getBlock();
      const lastCheckIn = await contract.read.lastCheckIn();
      assert.ok(lastCheckIn >= block.timestamp - 2n);
    });

    it("resets the execution countdown", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(DAY * 29n));
      await contract.write.checkIn();
      const [upkeepNeeded] = await contract.read.checkUpkeep(["0x"]);
      assert.equal(upkeepNeeded, false);
    });

    it("reverts when called by non-owner", async () => {
      const { contract, alice } = await deployChainWill();
      const aliceContract = await network.viem.getContractAt(
        "ChainWill",
        contract.address,
        { client: { wallet: alice } }
      );
      await assert.rejects(
        () => aliceContract.write.checkIn(),
        /OwnableUnauthorizedAccount/
      );
    });
  });

  // checkUpkeep

  describe("checkUpkeep", () => {
    it("returns false when not configured", async () => {
      const { contract } = await deployChainWill();
      const [upkeepNeeded] = await contract.read.checkUpkeep(["0x"]);
      assert.equal(upkeepNeeded, false);
    });

    it("returns false before threshold is reached", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(DAY * 29n));
      const [upkeepNeeded] = await contract.read.checkUpkeep(["0x"]);
      assert.equal(upkeepNeeded, false);
    });

    it("returns true after threshold is reached", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(THIRTY_DAYS + 1n));
      const [upkeepNeeded] = await contract.read.checkUpkeep(["0x"]);
      assert.equal(upkeepNeeded, true);
    });

    it("returns false when paused", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(THIRTY_DAYS + 1n));
      await contract.write.pause();
      const [upkeepNeeded] = await contract.read.checkUpkeep(["0x"]);
      assert.equal(upkeepNeeded, false);
    });

    it("returns false after will is executed", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(THIRTY_DAYS + 1n));
      await contract.write.performUpkeep(["0x"]);
      const [upkeepNeeded] = await contract.read.checkUpkeep(["0x"]);
      assert.equal(upkeepNeeded, false);
    });
  });

  // ETH inheritance

  describe("ETH inheritance", () => {
    it("distributes ETH proportionally to beneficiaries", async () => {
      const { contract, owner, alice, bob, publicClient } = await deployChainWill();
      await contract.write.configureWill([
        twoBeneficiaries(alice.account.address, bob.account.address),
        THIRTY_DAYS,
      ]);
      await owner.sendTransaction({ to: contract.address, value: parseEther("1") });

      const aliceBefore = await publicClient.getBalance({ address: alice.account.address });
      const bobBefore   = await publicClient.getBalance({ address: bob.account.address });

      await network.networkHelpers.time.increase(Number(THIRTY_DAYS + 1n));
      await contract.write.performUpkeep(["0x"]);

      const aliceAfter = await publicClient.getBalance({ address: alice.account.address });
      const bobAfter   = await publicClient.getBalance({ address: bob.account.address });

      assert.equal(aliceAfter - aliceBefore, parseEther("0.5"));
      assert.equal(bobAfter   - bobBefore,   parseEther("0.5"));
    });

    it("sets willExecuted to true after execution", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(THIRTY_DAYS + 1n));
      await contract.write.performUpkeep(["0x"]);
      assert.equal(await contract.read.willExecuted(), true);
    });

    it("reverts on second performUpkeep call", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(THIRTY_DAYS + 1n));
      await contract.write.performUpkeep(["0x"]);
      await assert.rejects(
        () => contract.write.performUpkeep(["0x"]),
        /AlreadyExecuted/
      );
    });

    it("reverts if threshold not yet reached", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(DAY * 29n));
      await assert.rejects(
        () => contract.write.performUpkeep(["0x"]),
        /ThresholdNotReached/
      );
    });

    it("handles zero ETH balance gracefully", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(THIRTY_DAYS + 1n));
      await contract.write.performUpkeep(["0x"]);
      assert.equal(await contract.read.willExecuted(), true);
    });
  });

  // timeUntilExecution

  describe("timeUntilExecution", () => {
    it("returns remaining seconds before threshold", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(DAY * 10n));
      const remaining = await contract.read.timeUntilExecution();
      const expected  = DAY * 20n;
      assert.ok(
        remaining >= expected - 5n && remaining <= expected + 5n,
        `Expected ~${expected}, got ${remaining}`
      );
    });

    it("returns 0 when threshold is passed", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(THIRTY_DAYS + DAY));
      assert.equal(await contract.read.timeUntilExecution(), 0n);
    });
  });

  // Emergency controls

  describe("emergency controls", () => {
    it("owner can pause and unpause", async () => {
      const { contract } = await deployChainWill();
      await contract.write.pause();
      assert.equal(await contract.read.paused(), true);
      await contract.write.unpause();
      assert.equal(await contract.read.paused(), false);
    });

    it("checkIn reverts when paused", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await contract.write.pause();
      await assert.rejects(
        () => contract.write.checkIn(),
        /EnforcedPause/
      );
    });

    it("owner can withdraw ETH when paused", async () => {
      const { contract, owner, publicClient } = await deployChainWill();
      await owner.sendTransaction({ to: contract.address, value: parseEther("1") });
      await contract.write.pause();
      const balanceBefore = await publicClient.getBalance({ address: owner.account.address });
      await contract.write.emergencyWithdrawETH();
      const balanceAfter = await publicClient.getBalance({ address: owner.account.address });
      assert.ok(balanceAfter > balanceBefore);
    });

    it("emergencyWithdrawETH reverts when not paused", async () => {
      const { contract } = await deployChainWill();
      await assert.rejects(
        () => contract.write.emergencyWithdrawETH(),
        /ExpectedPause/
      );
    });
  });

  it("owner can reset will when paused", async () => {
      const { contract, alice, bob } = await deployChainWill();
      await contract.write.configureWill([
        twoBeneficiaries(alice.account.address, bob.account.address),
        THIRTY_DAYS,
      ]);
      await contract.write.pause();
      await contract.write.resetWill();
      assert.equal(await contract.read.isConfigured(), false);
      const bens = await contract.read.getBeneficiaries();
      assert.equal(bens.length, 0);
    });

    it("resetWill reverts when not paused", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await assert.rejects(
        () => contract.write.resetWill(),
        /ExpectedPause/
      );
    });

    it("resetWill reverts after will is executed", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      await network.networkHelpers.time.increase(Number(THIRTY_DAYS + 1n));
      await contract.write.performUpkeep(["0x"]);
      await contract.write.pause();
      await assert.rejects(
        () => contract.write.resetWill(),
        /AlreadyExecuted/
      );
    });

  // getWillStatus

  describe("getWillStatus", () => {
    it("returns correct status before configuration", async () => {
      const { contract } = await deployChainWill();
      const status = await contract.read.getWillStatus();
      assert.equal(status[0], false); // isConfigured
      assert.equal(status[1], false); // willExecuted
      assert.equal(status[2], false); // isPaused
    });

    it("returns correct status after configuration", async () => {
      const { contract, alice } = await deployChainWill();
      await contract.write.configureWill([
        [{ wallet: alice.account.address, allocation: 10_000n }],
        THIRTY_DAYS,
      ]);
      const status = await contract.read.getWillStatus();
      assert.equal(status[0], true);  // isConfigured
      assert.equal(status[1], false); // willExecuted
      assert.equal(status[7], 1n);    // beneficiaryCount
    });
  });

});
