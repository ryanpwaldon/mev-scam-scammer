import { Module } from '@nestjs/common'
import { AppService } from 'src/app.service'
import { GasModule } from './modules/gas/gas.module'
import { BlockModule } from './modules/block/block.module'
import { ExecutorModule } from './modules/executor/executor.module'
import { ProviderModule } from './modules/provider/provider.module'

@Module({
  imports: [ExecutorModule, ProviderModule, BlockModule, GasModule],
  providers: [AppService],
})
export class AppModule {}
