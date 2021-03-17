import { tokens, EVM_REVERT } from "./helpers";

const Token = artifacts.require("./Token");
require("chai").use(require("chai-as-promised")).should();

contract("Token", ([deployer, _sender, receiver]) => {
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

  describe("sending tokens successfuly", () => {
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

    it("emits a transfer event", async () => {
      const [log] = result.logs;
      log.event.should.eq("Transfer");
      const event = log.args;
      event.from.toString().should.equal(deployer, "from is corect");
      event.to.toString().should.equal(receiver, "to is corect");
      event.value.toString().should.equal(amount, "value is corect");
    });
  });

  describe("sending tokens failure", () => {
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
