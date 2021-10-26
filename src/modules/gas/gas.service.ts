import log from 'src/utils/log'
import { GWEI } from 'src/constants'
import { Injectable } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'
import { parseUnits } from '@ethersproject/units'
import { BigNumber } from '@ethersproject/bignumber'
import prettifyNumber from 'src/utils/prettifyNumber'

const MAX_FEE_PER_GAS_MULTIPLIER = 2
const MAX_PRIORITY_FEE_PER_GAS_MULTIPLIER = 20

@Injectable()
export class GasService {
  private started = false
  private client: AxiosInstance
  private reasonableMaxFeePerGas!: BigNumber
  private reasonableMaxPriorityFeePerGas!: BigNumber

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.blocknative.com/gasprices/blockprices',
      headers: { Authorization: process.env.BLOCKNATIVE_DAPP_ID as string },
    })
  }

  start() {
    if (this.started) return
    console.log(`⛽️ Gas Monitor: Started`)
    setInterval(this.updateReasonableGasPrice.bind(this), 1500)
    setInterval(() => log([
      `⛽️ Gas: Priority Fee: ${prettifyNumber(this.reasonableMaxPriorityFeePerGas.div(GWEI))} gwei`,
      `⛽️ Gas: Max Fee: ${prettifyNumber(this.reasonableMaxFeePerGas.div(GWEI))} gwei`,
    ]), 60000) // prettier-ignore
    this.started = true
  }

  async updateReasonableGasPrice() {
    try {
      const { maxPriorityFeePerGas, maxFeePerGas } = ((await this.client({ method: 'get' })) as any).data.blockPrices[0].estimatedPrices[0]
      this.reasonableMaxPriorityFeePerGas = parseUnits(maxPriorityFeePerGas.toString(), 'gwei').mul(MAX_PRIORITY_FEE_PER_GAS_MULTIPLIER)
      this.reasonableMaxFeePerGas = parseUnits(maxFeePerGas.toString(), 'gwei').mul(MAX_FEE_PER_GAS_MULTIPLIER)
    } catch (err) {
      console.log(`🔴 Gas Monitor: Error fetching data`, err)
    }
  }

  getReasonableFeePerGas() {
    return {
      reasonableMaxFeePerGas: this.reasonableMaxFeePerGas,
      reasonableMaxPriorityFeePerGas: this.reasonableMaxPriorityFeePerGas,
    }
  }
}
