import logTable from 'src/utils/logTable'
import { Injectable } from '@nestjs/common'
import Erc20Abi from '../../abi/Erc20.json'
import getChainId from 'src/utils/getChainId'
import { Wallet } from '@ethersproject/wallet'
import { Interface } from '@ethersproject/abi'
import isProduction from 'src/utils/isProduction'
import { BaseProvider } from '@ethersproject/providers'
import { GasService } from 'src/modules/gas/gas.service'
import { BlockService } from 'src/modules/block/block.service'
import getFlashbotsEndpoint from 'src/utils/getFlashbotsEndpoint'
import { ProviderService } from 'src/modules/provider/provider.service'
import { FlashbotsBundleProvider, FlashbotsBundleTransaction } from '@flashbots/ethers-provider-bundle'
import { BigNumber } from '@ethersproject/bignumber'
import { formatEther } from '@ethersproject/units'

const GWEI = BigNumber.from(10).pow(9)

const ESTIMATED_GAS_SEND_ETH = 21000
const ESTIMATED_GAS_SEND_TETHER = '63209'
const ESTIMATED_GAS = ESTIMATED_GAS_SEND_ETH + ESTIMATED_GAS_SEND_TETHER
const TETHER_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'

@Injectable()
export class ExecutorService {
  walletMain: Wallet
  walletScammer: Wallet
  authSigner: Wallet
  provider: BaseProvider
  erc20Interface: Interface
  flashbots!: FlashbotsBundleProvider

  constructor(
    private readonly gasService: GasService,
    private readonly blockService: BlockService,
    private readonly providerService: ProviderService,
  ) {
    this.authSigner = Wallet.createRandom()
    this.erc20Interface = new Interface(Erc20Abi)
    this.provider = this.providerService.getProvider()
    this.walletMain = new Wallet(process.env.WALLET_MAIN as string, this.provider)
    this.walletScammer = new Wallet(process.env.WALLET_SCAMMER as string, this.provider)
  }

  async start() {
    this.flashbots = await FlashbotsBundleProvider.create(this.provider, this.authSigner, getFlashbotsEndpoint())
    formatEther(await this.walletMain.getBalance())
    formatEther(await this.walletScammer.getBalance())
    console.log(`🟢 Executor: Ready`)
  }

  async execute() {
    try {
      console.log(`🟢 Executor: Executing`)
      let attempt = 1
      const removeListener = this.blockService.onNewBlock((blockNumber) => {
        attempt++

        const { maxPriorityFeePerGas, baseFeePerGas } = this.gasService.getGasEstimate()
        const sendEthAmount = BigNumber.from(ESTIMATED_GAS_SEND_TETHER).mul(baseFeePerGas.add(maxPriorityFeePerGas))
        console.log('💰 Gwei to send: ', sendEthAmount.div(GWEI).toString())
        const sendUsdtTxData = this.erc20Interface.encodeFunctionData('transfer', [this.walletMain.address, BigNumber.from('193325151')])

        const bundle: FlashbotsBundleTransaction[] = [
          {
            transaction: {
              type: 2,
              maxPriorityFeePerGas,
              value: sendEthAmount,
              chainId: getChainId(),
              to: this.walletScammer.address,
              maxFeePerGas: baseFeePerGas.add(maxPriorityFeePerGas),
            },
            signer: this.walletMain,
          },
          {
            transaction: {
              type: 2,
              to: TETHER_ADDRESS,
              data: sendUsdtTxData,
              chainId: getChainId(),
              maxPriorityFeePerGas,
              maxFeePerGas: baseFeePerGas.add(maxPriorityFeePerGas),
              gasLimit: BigNumber.from(ESTIMATED_GAS_SEND_TETHER),
            },
            signer: this.walletScammer,
          },
        ]
        this.sendBundle(bundle, blockNumber + 1, attempt, removeListener)
      })
    } catch (err) {
      console.log('🔴 Executor: Error executing strategy', err)
    }
  }

  private async sendBundle(bundle: FlashbotsBundleTransaction[], blockNumber: number, attempt: number, stopRetries: () => void) {
    logTable({ Attempt: attempt, 'Block Number': blockNumber })
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
      // stopRetries()
    }
  }
}
