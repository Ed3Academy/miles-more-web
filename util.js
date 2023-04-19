import BigNumber from "bignumber.js";

const DECIMAL = String(1e18);

export const formatBigNumber = (bn, decimals = DECIMAL) => {
  return new BigNumber(bn.toString()).div(decimals).toString();
};
