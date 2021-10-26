import { constants } from 'ethers'
import logTable from 'src/utils/logTable'
import { Injectable } from '@nestjs/common'
import Erc721Abi from '../../abi/Erc721.json'
import getChainId from 'src/utils/getChainId'
import { Wallet } from '@ethersproject/wallet'
import { Interface } from '@ethersproject/abi'
import OpenseaAbi from '../../abi/Opensea.json'
import isProduction from 'src/utils/isProduction'
import { Transaction } from 'src/types/Transaction'
import { BigNumber } from '@ethersproject/bignumber'
import prettifyNumber from 'src/utils/prettifyNumber'
import { BaseProvider } from '@ethersproject/providers'
import TheFungibleAbi from '../../abi/TheFungible.json'
import { AshService } from 'src/modules/ash/ash.service'
import { GasService } from 'src/modules/gas/gas.service'
import { formatEther, parseUnits } from '@ethersproject/units'
import { BlockService } from 'src/modules/block/block.service'
import UniswapV3RouterAbi from '../../abi/UniswapV3Router.json'
import getFlashbotsEndpoint from 'src/utils/getFlashbotsEndpoint'
import { ProviderService } from 'src/modules/provider/provider.service'
import { FlashbotsBundleProvider, FlashbotsBundleTransaction } from '@flashbots/ethers-provider-bundle'
import { ASH_ADDRESS, WETH_ADDRESS, OPENSEA_ADDRESS, ASH_BURN_ADDRESS, THE_FUNGIBLE_ADDRESS, UNISWAP_V3_ROUTER_ADDRESS, GWEI } from 'src/constants'

import { BigNumber } from '@ethersproject/bignumber'
export const GWEI = BigNumber.from(10).pow(9)

const ESTIMATED_GAS_BUY_CUBE = 218787
const ESTIMATED_GAS_BURN_CUBE = 257130
const ESTIMATED_GAS_SELL_ASH = 231539
const ESTIMATED_GAS = ESTIMATED_GAS_BUY_CUBE + ESTIMATED_GAS_BURN_CUBE + ESTIMATED_GAS_SELL_ASH

@Injectable()
export class ExecutorService {
  wallet: Wallet
  executionId = 0
  authSigner: Wallet
  provider: BaseProvider
  erc721Interface: Interface
  openseaInterface: Interface
  theFungibleInterface: Interface
  flashbots!: FlashbotsBundleProvider
  uniswapV3RouterInterface: Interface

  constructor(
    private readonly ashService: AshService,
    private readonly gasService: GasService,
    private readonly blockService: BlockService,
    private readonly providerService: ProviderService,
  ) {
    this.erc721Interface = new Interface(Erc721Abi)
    this.openseaInterface = new Interface(OpenseaAbi)
    this.provider = this.providerService.getProvider()
    this.theFungibleInterface = new Interface(TheFungibleAbi)
    this.uniswapV3RouterInterface = new Interface(UniswapV3RouterAbi)
    this.wallet = new Wallet(process.env.WALLET_1 as string, this.provider)
    this.authSigner = isProduction() ? new Wallet(<string>process.env.FLASHBOTS_AUTH_SIGNER) : Wallet.createRandom()
  }

  async start() {
    this.flashbots = await FlashbotsBundleProvider.create(this.provider, this.authSigner, getFlashbotsEndpoint())
    console.log(`🟢 Executor: Ready`)
  }

  extractTokenId(tx: Transaction) {
    const decodedFunctionData = this.openseaInterface.decodeFunctionData('atomicMatch_', tx.input)
    const decodedCalldataBuy = this.erc721Interface.decodeFunctionData('transferFrom', decodedFunctionData.calldataBuy)
    const tokenId = decodedCalldataBuy.tokenId.toNumber()
    return tokenId
  }

  private buildTx(txData: { data: string; to: string; value?: BigNumber; maxFeePerGas?: BigNumber; maxPriorityFeePerGas?: BigNumber }) {
    return { type: 2, chainId: getChainId(), ...txData }
  }

  private buildBuyCubeTx(tx: Transaction, maxFeePerGas: BigNumber, maxPriorityFeePerGas: BigNumber) {
    const txAddressTrimmed = tx.from.slice(2).toLowerCase()
    const myAddressTrimmed = this.wallet.address.slice(2).toLowerCase()
    const txData = tx.input.replace(new RegExp(txAddressTrimmed, 'g'), myAddressTrimmed)
    return this.buildTx({
      data: txData,
      to: OPENSEA_ADDRESS,
      value: parseUnits(tx.value, 'wei'),
      maxFeePerGas,
      maxPriorityFeePerGas,
    })
  }

  private buildBurnCubeTx(tx: Transaction, maxFeePerGas: BigNumber, maxPriorityFeePerGas: BigNumber) {
    const tokenId = this.extractTokenId(tx)
    const txData = this.theFungibleInterface.encodeFunctionData('safeTransferFrom', [this.wallet.address, ASH_BURN_ADDRESS, tokenId])
    return this.buildTx({
      data: txData,
      to: THE_FUNGIBLE_ADDRESS,
      maxFeePerGas,
      maxPriorityFeePerGas,
    })
  }

  private buildSellAshTx(maxFeePerGas: BigNumber, maxPriorityFeePerGas: BigNumber) {
    const amountIn = this.ashService.getBurnYieldInAshUnits()
    const amountOutMinimum = this.ashService.getEstimatedIncomeInWei()
    const exactInputSingleArgs = {
      amountIn,
      amountOutMinimum,
      tokenIn: ASH_ADDRESS,
      tokenOut: WETH_ADDRESS,
      fee: 10000,
      deadline: BigNumber.from(10).pow(18),
      sqrtPriceLimitX96: 0,
      recipient: constants.AddressZero,
    }
    const unwrapWETH9Args = {
      amountMinimum: amountOutMinimum,
      recipient: this.wallet.address,
    }
    const multicallArgs = {
      exactInputSingle: this.uniswapV3RouterInterface.encodeFunctionData('exactInputSingle', [exactInputSingleArgs]),
      unwraoWETH9: this.uniswapV3RouterInterface.encodeFunctionData('unwrapWETH9', [unwrapWETH9Args.amountMinimum, unwrapWETH9Args.recipient]),
    }
    const txData = this.uniswapV3RouterInterface.encodeFunctionData('multicall', [[multicallArgs.exactInputSingle, multicallArgs.unwraoWETH9]])
    return this.buildTx({
      data: txData,
      to: UNISWAP_V3_ROUTER_ADDRESS,
      maxFeePerGas,
      maxPriorityFeePerGas,
    })
  }

  evaluateStrategy(tx: Transaction) {
    try {
      const txMaxPriorityFeePerGas = BigNumber.from(tx.maxPriorityFeePerGas || tx.gasPrice)
      const txMaxFeePerGas = BigNumber.from(tx.maxFeePerGas || tx.gasPrice)
      const { reasonableMaxPriorityFeePerGas, reasonableMaxFeePerGas } = this.gasService.getReasonableFeePerGas()
      // Gas fees will always be at least 2x or greater than the target TXs specified gas.
      const maxPriorityFeePerGas = reasonableMaxPriorityFeePerGas.lt(txMaxPriorityFeePerGas.mul(2)) ? txMaxPriorityFeePerGas.mul(2) : reasonableMaxPriorityFeePerGas // prettier-ignore
      const maxFeePerGas = reasonableMaxFeePerGas.lt(txMaxFeePerGas.mul(2)) ? txMaxFeePerGas.mul(2) : reasonableMaxFeePerGas
      // ---------------------------------------------------------------------------------
      const cubeCost = BigNumber.from(tx.value)
      const estimatedGasFee = maxFeePerGas.mul(ESTIMATED_GAS)
      const estimatedCost = cubeCost.add(estimatedGasFee)
      const estimatedIncome = this.ashService.getEstimatedIncomeInWei()
      const estimatedProfit = estimatedIncome.sub(estimatedCost)
      logTable({
        'Strategy Evaluation': estimatedProfit.gt(0) ? '🟢 Profitable' : '🔴 Not Profitable',
        'Tx Type': tx.type,
        'Tx Max Priority Fee': `${prettifyNumber(txMaxPriorityFeePerGas.div(GWEI))} gwei`,
        'Tx Max Fee': `${prettifyNumber(txMaxFeePerGas.div(GWEI))} gwei`,
        'NFT Cost': `${prettifyNumber(formatEther(cubeCost))} Ξ`,
        'Max Priority Fee': `${prettifyNumber(maxPriorityFeePerGas.div(GWEI))} gwei`,
        'Max Fee': `${prettifyNumber(maxFeePerGas.div(GWEI))} gwei`,
        'Estimated Gas Fee': `${prettifyNumber(formatEther(estimatedGasFee))} Ξ`,
        'Total Cost': `${prettifyNumber(formatEther(estimatedCost))} Ξ`,
        Income: `${prettifyNumber(formatEther(estimatedIncome))} Ξ`,
        Profit: `${prettifyNumber(formatEther(estimatedProfit))} Ξ`,
        Time: new Date().toLocaleString('en-US'),
        'Tx Hash': tx.hash,
      })
      if (estimatedProfit.gt(0)) this.execute(tx, maxFeePerGas, maxPriorityFeePerGas)
    } catch (err) {
      console.log('🔴 Executor: Error evaluating strategy', err, tx)
    }
  }

  private async execute(tx: Transaction, maxFeePerGas: BigNumber, maxPriorityFeePerGas: BigNumber) {
    try {
      console.log(`🟢 Executor: Executing`)
      this.executionId++
      let executionAttempt = 1
      const executionId = this.executionId
      const buyCubeTx = this.buildBuyCubeTx(tx, maxFeePerGas, maxPriorityFeePerGas)
      const burnCubeTx = this.buildBurnCubeTx(tx, maxFeePerGas, maxPriorityFeePerGas)
      const sellAshTx = this.buildSellAshTx(maxFeePerGas, maxPriorityFeePerGas)
      const bundle = [buyCubeTx, burnCubeTx, sellAshTx].map((tx) => ({ transaction: tx, signer: this.wallet }))
      const removeListener = this.blockService.onNewBlock((blockNumber) => {
        executionAttempt++
        this.sendBundle(bundle, blockNumber + 1, executionId, executionAttempt, removeListener)
      })
      this.sendBundle(bundle, this.blockService.getLatestBlock() + 1, executionId, executionAttempt, removeListener) // send initial bundle without waiting for new block
    } catch (err) {
      console.log('🔴 Executor: Error executing strategy', err, tx)
    }
  }

  private async sendBundle(
    bundle: FlashbotsBundleTransaction[],
    blockNumber: number,
    executionId: number,
    executionAttempt: number,
    stopRetries: () => void,
  ) {
    logTable({
      'Execution ID': executionId,
      'Execution Attempt': executionAttempt,
      'Block Number': blockNumber,
    })
    try {
      if (isProduction()) {
        const tx = await this.flashbots.sendBundle(bundle, blockNumber)
        if ('error' in tx) return console.log(`🔴 Executor: Flashbots transaction error`, tx.error.message)
        const status = await tx.wait()
        if (status === 1) return console.log(`🔴 Executor: Bundle passed without inclusion`)
        if (status === 2) return console.log(`🔴 Executor: Account nonce too high`)
        console.log(`🟢 Executor: Bundle processed`)
        stopRetries()
      } else {
        const signedBundle = await this.flashbots.signBundle(bundle)
        const tx = await this.flashbots.simulate(signedBundle, blockNumber)
        if ('error' in tx) return console.log(`🔴 Executor: Flashbots transaction error`, tx.error.message)
        console.log(`🟢 Executor: Simulation result`)
        console.log(JSON.stringify(tx, null, 2))
        stopRetries()
      }
    } catch (err) {
      console.log(`🔴 Executor: Flashbots transaction error`, err)
      stopRetries()
    }
  }
}
