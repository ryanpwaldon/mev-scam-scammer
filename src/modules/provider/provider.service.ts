import { providers } from 'ethers'
import { Injectable } from '@nestjs/common'
import { BaseProvider } from '@ethersproject/providers'

@Injectable()
export class ProviderService {
  private readonly provider: BaseProvider

  constructor() {
    this.provider = new providers.WebSocketProvider(
      `wss://${process.env.NETWORK}.infura.io/ws/v3/${process.env.INFURA_PROJECT_ID}`,
      process.env.NETWORK,
    )
  }

  getProvider() {
    return this.provider
  }
}
