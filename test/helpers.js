const ether = (n) => new web3.utils.BN(web3.utils.toWei(n.toString(), "ether"));

const tokens = (n) =>
  new web3.utils.BN(web3.utils.toWei(n.toString(), "ether"));

const EVM_REVERT = "VM Exception while processing transaction: revert";
const ETHER_ADDRESS = "0x0000000000000000000000000000000000000000";

export { tokens, ether, EVM_REVERT, ETHER_ADDRESS };
