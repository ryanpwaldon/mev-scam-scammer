import { GasService } from 'src/modules/gas/gas.service'
import { BlockService } from 'src/modules/block/block.service'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ExecutorService } from 'src/modules/executor/executor.service'

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    private readonly blockService: BlockService,
    private readonly executorService: ExecutorService,
    private readonly gasService: GasService,
  ) {}

  async onApplicationBootstrap() {
    await this.executorService.start()
    await this.gasService.start()
    this.blockService.startBloxroute()
    this.executorService.execute()
  }
}
