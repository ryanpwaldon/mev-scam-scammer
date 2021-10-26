import { GasService } from 'src/modules/gas/gas.service'
import { BlockService } from 'src/modules/block/block.service'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ExecutorService } from 'src/modules/executor/executor.service'

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    private readonly gasService: GasService,
    private readonly blockService: BlockService,
    private readonly executorService: ExecutorService,
  ) {}

  onApplicationBootstrap() {
    setTimeout(async () => {
      this.gasService.start()
      this.executorService.start()
      this.blockService.start()
    }, 1000)
  }
}
