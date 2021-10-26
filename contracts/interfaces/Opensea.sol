// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

interface IOpensea {
  enum FeeMethod {
    ProtocolFee,
    SplitFee
  }
  enum Side {
    Buy,
    Sell
  }
  enum SaleKind {
    FixedPrice,
    DutchAuction
  }
  enum HowToCall {
    Call,
    DelegateCall
  }

  function approveOrder_(
    address[7] memory addrs,
    uint256[9] memory uints,
    FeeMethod feeMethod,
    Side side,
    SaleKind saleKind,
    HowToCall howToCall,
    bytes calldata,
    bytes memory replacementPattern,
    bytes memory staticExtradata,
    bool orderbookInclusionDesired
  ) external;
}
