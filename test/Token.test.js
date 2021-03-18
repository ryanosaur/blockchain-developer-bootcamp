import { tokens, EVM_REVERT } from "./helpers";

const Token = artifacts.require("./Token");
require("chai").use(require("chai-as-promised")).should();

contract("Token", ([deployer, receiver, exchange] /** list of accoounts */) => {
  const name = "DApp Token";
  const symbol = "DAPP";
  const decimals = "18";
  const totalSupply = tokens(21000000).toString();
  let token = null;
  beforeEach(async () => {
    token = await Token.new();
  });

  describe("deployment", () => {
    it("tracks the name", async () => {
      const result = await token.name();
      result.should.equal(name);
    });

    it("tracks the symbol", async () => {
      const result = await token.symbol();
      result.should.equal(symbol);
    });

    it("tracks the decimals", async () => {
      const result = await token.decimals();
      result.toString().should.equal(decimals);
    });

    it("tracks the total supply", async () => {
      const result = await token.totalSupply();
      result.toString().should.equal(totalSupply.toString());
    });

    it("assigns the total supply to the deployer", async () => {
      const result = await token.balanceOf(deployer);
      result.toString().should.equal(totalSupply.toString());
    });
  });

  describe("sending tokens", () => {
    describe("success", () => {
      let amount = null;
      let result = null;

      beforeEach(async () => {
        amount = tokens(1000000).toString();
        result = await token.transfer(receiver, amount, {
          from: deployer,
        });
      });

      it("transfers token balances", async () => {
        const deployerBalance = await token.balanceOf(deployer);
        deployerBalance.toString().should.equal(tokens(20000000).toString());
        const receiverBalance = await token.balanceOf(receiver);
        receiverBalance.toString().should.equal(amount);
      });

      it("emits a Transfer event", async () => {
        const [log] = result.logs;
        log.event.should.eq("Transfer");
        const event = log.args;
        event.from.toString().should.equal(deployer, "from is corect");
        event.to.toString().should.equal(receiver, "to is corect");
        event.value.toString().should.equal(amount, "value is corect");
      });
    });
    describe("failure", () => {
      it("rejects insufficient balances", async () => {
        // greater than totalSupply
        const amount = tokens(10000000000).toString();
        await token
          .transfer(receiver, amount, {
            from: deployer,
          })
          .should.be.rejectedWith(EVM_REVERT);

        // sending account has no balance
        await token
          .transfer(deployer, tokens(1).toString(), {
            from: receiver,
          })
          .should.be.rejectedWith(EVM_REVERT);
      });

      it("rejects invalid recipients", async () => {
        const amount = tokens(1).toString();
        await token.transfer("0x0", amount, {
          from: receiver,
        }).should.be.rejected;
      });
    });
  });

  describe("approving tokens", () => {
    describe("success", () => {
      let amount = null;
      let result = null;

      beforeEach(async () => {
        amount = tokens(1000000).toString();
        result = await token.approve(exchange, amount, {
          from: deployer,
        });
      });

      it("allocates an allowance for delegated token spending on an exchange", async () => {
        const allowance = await token.allowance(deployer, exchange);
        allowance.toString().should.equal(amount.toString());
      });

      it("emits a Approval event", async () => {
        const [log] = result.logs;
        log.event.should.eq("Approval");
        const event = log.args;
        event.owner.toString().should.equal(deployer, "owner is corect");
        event.spender.toString().should.equal(exchange, "spender is corect");
        event.value.toString().should.equal(amount, "value is corect");
      });
    });

    describe("failure", () => {
      it("rejects invalid spenders", async () => {
        await token.approve(0x0, tokens(1).toString(), {
          from: deployer,
        }).should.be.rejected;
      });
    });
  });

  describe("delegating token transfers from exchange", () => {
    let amount = null;
    let result = null;

    beforeEach(async () => {
      amount = tokens(1000000).toString();
      await token.approve(exchange, amount, { from: deployer });
    });
    describe("success", () => {
      beforeEach(async () => {
        result = await token.transferFrom(deployer, receiver, amount, {
          from: exchange,
        });
      });

      it("transfers token balances", async () => {
        const deployerBalance = await token.balanceOf(deployer);
        deployerBalance.toString().should.equal(tokens(20000000).toString());
        const receiverBalance = await token.balanceOf(receiver);
        receiverBalance.toString().should.equal(amount);
      });

      it("resets the allowance", async () => {
        const allowance = await token.allowance(deployer, exchange);
        allowance.toString().should.equal("0");
      });

      it("emits a Transfer event", async () => {
        const [log] = result.logs;
        log.event.should.eq("Transfer");
        const event = log.args;
        event.from.toString().should.equal(deployer, "from is corect");
        event.to.toString().should.equal(receiver, "to is corect");
        event.value.toString().should.equal(amount, "value is corect");
      });
    });
    describe("failure", () => {
      it("rejects insufficient balances", async () => {
        // greater than totalSupply
        const amount = tokens(10000000000).toString();
        await token
          .transferFrom(deployer, receiver, amount, {
            from: exchange,
          })
          .should.be.rejectedWith(EVM_REVERT);
        // sending account has no balance
        await token
          .transferFrom(receiver, deployer, tokens(1).toString(), {
            from: exchange,
          })
          .should.be.rejectedWith(EVM_REVERT);
      });

      it("rejects invalid recipients", async () => {
        const amount = tokens(1).toString();
        await token.transferFrom(deployer, "0x0", amount, {
          from: exchange,
        }).should.be.rejected;
      });
    });
  });
});
