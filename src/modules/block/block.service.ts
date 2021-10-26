import WebSocket from 'ws'
import EventEmitter from 'events'
import isMainnet from 'src/utils/isMainnet'
import { Injectable } from '@nestjs/common'
import { ProviderService } from 'src/modules/provider/provider.service'

const NEW_BLOCK_EVENT = 'newBlock'

@Injectable()
export class BlockService {
  private latestBlock?: number
  private readonly eventEmitter: EventEmitter

  constructor(private readonly providerService: ProviderService) {
    this.eventEmitter = new EventEmitter()
  }

  start() {
    if (isMainnet()) this.startBloxroute()
    else this.startInfura()
  }

  getLatestBlock() {
    if (!this.latestBlock) throw new Error('🔴 Block: Latest block does not exist')
    return this.latestBlock
  }

  handleNewBlock(blockNumber: number) {
    if (this.latestBlock !== blockNumber) {
      this.latestBlock = blockNumber
      this.eventEmitter.emit(NEW_BLOCK_EVENT, blockNumber)
      console.log(`🧱 Block: ${blockNumber}`)
    }
  }

  onNewBlock(callback: (blockNumber: number) => void) {
    const listener = this.eventEmitter.on(NEW_BLOCK_EVENT, callback)
    return () => {
      console.log('🧱 Block: Listener removed')
      listener.off(NEW_BLOCK_EVENT, callback)
    }
  }

  startInfura() {
    console.log('🧱 Block: Start Infura')
    this.providerService.getProvider().on('block', this.handleNewBlock.bind(this))
  }

  startBloxroute() {
    console.log('🧱 Block: Start Bloxroute')
    const ws = new WebSocket('wss://api.blxrbdn.com/ws', {
      headers: { Authorization: process.env.BLOCKXROUTE_AUTHORIZATION_HEADER },
      rejectUnauthorized: false,
    })
    ws.on('open', () => ws.send(`{"jsonrpc": "2.0", "id": 1, "method": "subscribe", "params": ["newBlocks", {"include": ["hash"]}]}`))
    ws.on('message', (buffer: Buffer) => {
      const data = JSON.parse(buffer.toString())
      if (data.method !== 'subscribe') return
      const blockNumber = parseInt(data.params.result.header.number, 16)
      this.handleNewBlock(blockNumber)
    })
  }
}
