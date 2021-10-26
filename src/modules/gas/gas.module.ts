import { Module } from '@nestjs/common'
import { GasService } from './gas.service'

@Module({
  providers: [GasService],
  exports: [GasService],
})
export class GasModule {}
