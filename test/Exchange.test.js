import { tokens, ether, EVM_REVERT, ETHER_ADDRESS } from "./helpers";

const Exchange = artifacts.require("./Exchange");
const Token = artifacts.require("./Token");
require("chai").use(require("chai-as-promised")).should();

contract("Exchange", ([deployer, feeAccount, user1, user2]) => {
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
      event.token.toString().should.equal(ETHER_ADDRESS, "token is correct");
      event.user.toString().should.equal(user1, "user is correct");
      event.amount
        .toString()
        .should.equal(amount.toString(), "amount is correct");
      event.balance
        .toString()
        .should.equal(amount.toString(), "balance is correct");
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
        event.token.toString().should.equal(ETHER_ADDRESS, "ether is correct");
        event.user.toString().should.equal(user1, "user is correct");
        event.amount
          .toString()
          .should.equal(amount.toString(), "amount is correct");
        event.balance.toString().should.equal("0", "balance is correct");
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
    const amount = tokens(1);

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
        event.token.toString().should.equal(token.address, "token is correct");
        event.user.toString().should.equal(user1, "user is correct");
        event.amount
          .toString()
          .should.equal(amount.toString(), "amount is correct");
        event.balance
          .toString()
          .should.equal(amount.toString(), "balance is correct");
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
    const amount = tokens(1);
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
          .should.equal(token.address, "token address is correct");
        event.user.toString().should.equal(user1, "user is correct");
        event.amount
          .toString()
          .should.equal(amount.toString(), "amount is correct");
        event.balance.toString().should.equal("0", "balance is correct");
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
    const tokenAmount = tokens(1);
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
  describe("making orders", async () => {
    let result = null;
    const etherAmount = ether(1);
    const tokenAmount = tokens(1);
    beforeEach(async () => {
      result = await exchange.makeOrder(
        token.address,
        tokenAmount,
        ETHER_ADDRESS,
        etherAmount,
        {
          from: user1,
        }
      );
    });
    it("tracks the newly created order", async () => {
      const orderCount = await exchange.orderCount();
      orderCount.toString().should.equal("1");
      const order = await exchange.orders("1");
      order.id.toString().should.equal("1", "user is correct");
      order.user.toString().should.equal(user1, "user is correct");
      order.tokenGet
        .toString()
        .should.equal(token.address, "token address is correct");
      order.tokenGive
        .toString()
        .should.equal(ETHER_ADDRESS, "ether address is correct");
      order.amountGet
        .toString()
        .should.equal(tokenAmount.toString(), "token amount is correct");
      order.amountGive
        .toString()
        .should.equal(etherAmount.toString(), "ether amount is correct");
      order.timestamp
        .toString()
        .length.should.be.at.least(1, "timestamp is present");
    });
    it("emits an Order event", async () => {
      const [log] = result.logs;
      log.event.should.eq("Order");
      const event = log.args;
      event.id.toString().should.equal("1", "user is correct");
      event.user.toString().should.equal(user1, "user is correct");
      event.tokenGet
        .toString()
        .should.equal(token.address, "token address is correct");
      event.tokenGive
        .toString()
        .should.equal(ETHER_ADDRESS, "ether address is correct");
      event.amountGet
        .toString()
        .should.equal(tokenAmount.toString(), "token amount is correct");
      event.amountGive
        .toString()
        .should.equal(etherAmount.toString(), "ether amount is correct");
      event.timestamp
        .toString()
        .length.should.be.at.least(1, "timestamp is present");
    });
  });
  describe("order actions", async () => {
    const etherAmount = ether(1);
    const tokenAmount = tokens(1);
    beforeEach(async () => {
      await exchange.depositEther({ from: user1, value: etherAmount });
      await exchange.makeOrder(
        token.address,
        tokenAmount,
        ETHER_ADDRESS,
        etherAmount,
        {
          from: user1,
        }
      );
    });

    describe("cancelling orders", () => {
      let result = null;

      describe("success", async () => {
        beforeEach(async () => {
          result = await exchange.cancelOrder(1, { from: user1 });
        });

        it("updates cancelled orders", async () => {
          const orderCancelled = await exchange.orderCancelled(1);
          orderCancelled.should.equal(true);
          const orderNotCancelled = await exchange.orderCancelled(100);
          orderNotCancelled.should.equal(false);
        });

        it("emits a Cancel event", async () => {
          const [log] = result.logs;
          log.event.should.eq("Cancel");
          const event = log.args;
          event.id.toString().should.equal("1", "user is correct");
          event.user.toString().should.equal(user1, "user is correct");
          event.tokenGet
            .toString()
            .should.equal(token.address, "token address is correct");
          event.tokenGive
            .toString()
            .should.equal(ETHER_ADDRESS, "ether address is correct");
          event.amountGet
            .toString()
            .should.equal(tokenAmount.toString(), "token amount is correct");
          event.amountGive
            .toString()
            .should.equal(etherAmount.toString(), "ether amount is correct");
          event.timestamp
            .toString()
            .length.should.be.at.least(1, "timestamp is present");
        });
      });
      describe("failure", async () => {
        it("rejects invalid order", async () => {
          const invalidOrderId = 9999;
          await exchange
            .cancelOrder(invalidOrderId, { from: user1 })
            .should.be.rejectedWith(EVM_REVERT);
        });
        it("reject canceling order for other user", async () => {
          await exchange
            .cancelOrder("1", { from: user2 })
            .should.be.rejectedWith(EVM_REVERT);
        });
      });
    });
  });
});
