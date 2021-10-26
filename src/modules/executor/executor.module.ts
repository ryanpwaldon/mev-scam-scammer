import { Module } from '@nestjs/common'
import { ExecutorService } from './executor.service'
import { AshModule } from 'src/modules/ash/ash.module'
import { GasModule } from 'src/modules/gas/gas.module'
import { BlockModule } from 'src/modules/block/block.module'
import { ProviderModule } from 'src/modules/provider/provider.module'

@Module({
  imports: [ProviderModule, BlockModule, AshModule, GasModule],
  providers: [ExecutorService],
  exports: [ExecutorService],
})
export class ExecutorModule {}
