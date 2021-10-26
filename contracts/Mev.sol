// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import './interfaces/Opensea.sol';

contract Mev {
  IOpensea private constant opensea = IOpensea(0x7Be8076f4EA4A4AD08075C2508e481d6C946D12b);

  function execute(
    uint256 _price,
    uint256 _listingTime,
    address _tokenAddress,
    address _sellerAddress,
    uint256 _makerRelayerFee
  ) external {
    address exchange = address(opensea);
    address maker = address(this);
    address taker = _sellerAddress;
    address feeRecipient = address(0);
    address target = _tokenAddress;
    address staticTarget = address(0);
    address paymentToken = address(0);
    uint256 makerRelayerFee = 1;
    uint256 takerRelayerFee = 1;
    uint256 makerProtocolFee = 1;
    uint256 takerProtocolFee = 1;
    uint256 basePrice = 1;
    uint256 extra = 1;
    uint256 listingTime = 1;
    uint256 expirationTime = 1;
    uint256 salt = 1;
    uint256 feeMethod = 1;
    uint256 side = 0;
    uint256 saleKind = 0;
    uint256 howToCall = 0;
    // bytes calldata
    // uint replacementPattern
    // uint staticExtradata
    // uint orderbookInclusionDesired
  }
}

// [
//   exchange: opensea,
//   maker: buyer address,
//   taker: seller address,
//   feeRecipient: address(0),
//   target: tokenAddress,
//   staticTarget: address(0),
//   paymentToken: address(0)
// ],
// [
//   makerRelayerFee,
//   takerRelayerFee,
//   makerProtocolFee,
//   takerProtocolFee,
//   basePrice,
//   extra,
//   listingTime,
//   expirationTime,
//   salt
// ],
// feeMethod,
// side,
// saleKind,
// howToCall,
// calldata,
// replacementPattern,
// staticExtradata,
// orderbookInclusionDesireds
