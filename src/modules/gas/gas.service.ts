import { Injectable } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'
import { parseUnits } from '@ethersproject/units'
import { BigNumber } from '@ethersproject/bignumber'
import log from 'src/utils/log'
import prettifyNumber from 'src/utils/prettifyNumber'

const GWEI = BigNumber.from(10).pow(9)

@Injectable()
export class GasService {
  private client: AxiosInstance
  baseFeePerGas!: BigNumber
  maxPriorityFeePerGas!: BigNumber

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.blocknative.com/gasprices/blockprices',
      headers: { Authorization: process.env.BLOCKNATIVE_DAPP_ID as string },
    })
  }

  async start() {
    console.log(`⛽️ Gas Monitor: Started`)
    await this.updateGasEstimate()
    setInterval(this.updateGasEstimate.bind(this), 1500)
  }

  async updateGasEstimate() {
    const data = (await this.client({ method: 'get' })).data as any
    this.baseFeePerGas = parseUnits(data.blockPrices[0].baseFeePerGas.toString(), 'gwei')
    this.maxPriorityFeePerGas = parseUnits(data.blockPrices[0].estimatedPrices[0].maxPriorityFeePerGas.toString(), 'gwei')
  }

  getGasEstimate() {
    log([
      `⛽️ Gas: Base Fee: ${prettifyNumber(this.baseFeePerGas.div(GWEI))} gwei`,
      `⛽️ Gas: Max Fee: ${prettifyNumber(this.maxPriorityFeePerGas.div(GWEI))} gwei`,
    ])
    return {
      baseFeePerGas: this.baseFeePerGas,
      maxPriorityFeePerGas: this.maxPriorityFeePerGas,
    }
  }
}
