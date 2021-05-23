import { tokens, ether, EVM_REVERT, ETHER_ADDRESS } from "./helpers";

const Exchange = artifacts.require("./Exchange");
const Token = artifacts.require("./Token");
require("chai").use(require("chai-as-promised")).should();

contract("Exchange", ([deployer, feeAccount, user1]) => {
  let exchange = null;
  let token = null;
  let feePercent = 1;
  beforeEach(async () => {
    token = await Token.new();
    exchange = await Exchange.new(feeAccount, feePercent);
    token.transfer(user1, tokens(100), { from: deployer });
  });

  describe("deployment", () => {
    it("tracks the fee account", async () => {
      const result = await exchange.feeAccount();
      result.should.equal(feeAccount);
    });
    it("tracks the fee percent", async () => {
      const result = await exchange.feePercent();
      result.toString().should.equal(feePercent.toString());
    });
  });

  describe("fallback", async () => {
    it("reverts when ether is sent to contract address", async () => {
      await exchange
        .sendTransaction({ value: 1, from: user1 })
        .should.be.rejectedWith(EVM_REVERT);
    });
  });

  describe("depositing ether", async () => {
    let result = null;
    const amount = ether(1);
    beforeEach(async () => {
      result = await exchange.depositEther({
        from: user1,
        value: amount,
      });
    });

    it("tracks the ether deposit", async () => {
      const balance = await exchange.tokens(ETHER_ADDRESS, user1);
      balance.toString().should.equal(amount.toString());
    });
    it("emits a Deposit event", async () => {
      const [log] = result.logs;
      log.event.should.eq("Deposit");
      const event = log.args;
      event.token.toString().should.equal(ETHER_ADDRESS, "token is corect");
      event.user.toString().should.equal(user1, "user is corect");
      event.amount
        .toString()
        .should.equal(amount.toString(), "amount is corect");
      event.balance
        .toString()
        .should.equal(amount.toString(), "balance is corect");
    });
  });

  describe("withdrawing ether", async () => {
    let result = null;
    const amount = ether(1);
    beforeEach(async () => {
      result = await exchange.depositEther({
        from: user1,
        value: amount,
      });
    });

    describe("success", async () => {
      beforeEach(async () => {
        result = await exchange.withdrawEther(amount, {
          from: user1,
        });
      });

      it("withdraws Ether funds", async () => {
        const balance = await exchange.tokens(ETHER_ADDRESS, user1);
        balance.toString().should.equal("0");
      });

      it("emits a Withdraw event", async () => {
        const [log] = result.logs;
        log.event.should.eq("Withdraw");
        const event = log.args;
        event.token.toString().should.equal(ETHER_ADDRESS, "ether is corect");
        event.user.toString().should.equal(user1, "user is corect");
        event.amount
          .toString()
          .should.equal(amount.toString(), "amount is corect");
        event.balance.toString().should.equal("0", "balance is corect");
      });
    });

    describe("failure", async () => {
      it("reject withdraws for insufficient funds", async () => {
        await exchange
          .withdrawEther(ether(100), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });
    });
  });

  describe("depositing tokens", () => {
    let result = null;
    const amount = tokens(10);

    describe("success", () => {
      beforeEach(async () => {
        await token.approve(exchange.address, amount, { from: user1 });
        result = await exchange.depositToken(token.address, amount, {
          from: user1,
        });
      });
      it("tracks the token deposit", async () => {
        // check the token balance
        const tokenBalance = await token.balanceOf(exchange.address);
        tokenBalance.toString().should.equal(amount.toString());

        // check tokens on the exchange
        const exchangeBalance = await exchange.tokens(token.address, user1);
        exchangeBalance.toString().should.equal(amount.toString());
      });
      it("emits a Deposit event", async () => {
        const [log] = result.logs;
        log.event.should.eq("Deposit");
        const event = log.args;
        event.token.toString().should.equal(token.address, "token is corect");
        event.user.toString().should.equal(user1, "user is corect");
        event.amount
          .toString()
          .should.equal(amount.toString(), "amount is corect");
        event.balance
          .toString()
          .should.equal(amount.toString(), "balance is corect");
      });
    });
    describe("failure", () => {
      it("rejects ether deposits", async () => {
        await exchange
          .depositToken(ETHER_ADDRESS, tokens(10), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });
      it("fails when no tokens are approved", async () => {
        await exchange
          .depositToken(token.address, tokens(10), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });
    });
  });

  describe("withdrawing tokens", async () => {
    let result = null;
    const amount = tokens(10);
    beforeEach(async () => {
      await token.approve(exchange.address, amount, { from: user1 });
      result = await exchange.depositToken(token.address, amount, {
        from: user1,
      });
    });

    describe("success", async () => {
      beforeEach(async () => {
        result = await exchange.withdrawToken(token.address, amount, {
          from: user1,
        });
      });

      it("withdraws token funds", async () => {
        const balance = await exchange.tokens(token.address, user1);
        balance.toString().should.equal("0");
      });

      it("emits a Withdraw event", async () => {
        const [log] = result.logs;
        log.event.should.eq("Withdraw");
        const event = log.args;
        event.token
          .toString()
          .should.equal(token.address, "token address is corect");
        event.user.toString().should.equal(user1, "user is corect");
        event.amount
          .toString()
          .should.equal(amount.toString(), "amount is corect");
        event.balance.toString().should.equal("0", "balance is corect");
      });
    });

    describe("failure", async () => {
      it("rejects ether withdraws", async () => {
        await exchange
          .withdrawToken(ETHER_ADDRESS, tokens(10), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });
      it("reject withdraws for insufficient funds", async () => {
        await exchange
          .withdrawToken(token.address, tokens(1000), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      });
    });
  });
  describe("checking balances", async () => {
    const etherAmount = ether(1);
    const tokenAmount = tokens(20);
    beforeEach(async () => {
      exchange.depositEther({
        from: user1,
        value: etherAmount,
      });
      await token.approve(exchange.address, tokenAmount, { from: user1 });
      await exchange.depositToken(token.address, tokenAmount, {
        from: user1,
      });
    });
    it("returns users ether balance", async () => {
      const result = await exchange.balanceOf(ETHER_ADDRESS, user1);
      result.toString().should.equal(etherAmount.toString());
    });
    it("returns users token balance", async () => {
      const result = await exchange.balanceOf(token.address, user1);
      result.toString().should.equal(tokenAmount.toString());
    });
  });
});
