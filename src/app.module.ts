import { Module } from '@nestjs/common'
import { AppService } from 'src/app.service'
import { AshModule } from './modules/ash/ash.module'
import { GasModule } from './modules/gas/gas.module'
import { BlockModule } from './modules/block/block.module'
import { MonitorModule } from './modules/monitor/monitor.module'
import { ExecutorModule } from './modules/executor/executor.module'
import { ProviderModule } from './modules/provider/provider.module'

@Module({
  imports: [ExecutorModule, ProviderModule, MonitorModule, BlockModule, AshModule, GasModule],
  providers: [AppService],
})
export class AppModule {}
