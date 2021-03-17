const tokens = (n) =>
  new web3.utils.BN(web3.utils.toWei(n.toString(), "ether"));

const EVM_REVERT = "VM Exception while processing transaction: revert";

export { tokens, EVM_REVERT };
