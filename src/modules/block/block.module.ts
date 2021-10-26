import { Module } from '@nestjs/common'
import { BlockService } from './block.service'
import { ProviderModule } from 'src/modules/provider/provider.module'

@Module({
  imports: [ProviderModule],
  providers: [BlockService],
  exports: [BlockService],
})
export class BlockModule {}
