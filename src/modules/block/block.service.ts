import WebSocket from 'ws'
import EventEmitter from 'events'
import { Injectable } from '@nestjs/common'

const NEW_BLOCK_EVENT = 'newBlock'

@Injectable()
export class BlockService {
  private latestBlock?: number
  private readonly eventEmitter: EventEmitter

  constructor() {
    this.eventEmitter = new EventEmitter()
  }

  getLatestBlock() {
    if (!this.latestBlock) throw new Error('🔴 Block: Latest block does not exist')
    return this.latestBlock
  }

  handleNewBlock(blockNumber: number) {
    if (this.latestBlock !== blockNumber) {
      console.log(`🧱 Block: ${blockNumber}`)
      this.latestBlock = blockNumber
      this.eventEmitter.emit(NEW_BLOCK_EVENT, blockNumber)
    }
  }

  onNewBlock(callback: (blockNumber: number) => void) {
    const listener = this.eventEmitter.on(NEW_BLOCK_EVENT, callback)
    return () => {
      console.log('🧱 Block: Listener removed')
      listener.off(NEW_BLOCK_EVENT, callback)
    }
  }

  startBloxroute() {
    return new Promise((resolve) => {
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
        resolve(blockNumber)
      })
    })
  }
}
