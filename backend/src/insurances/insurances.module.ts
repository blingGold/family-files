import { Module } from '@nestjs/common';
import { InsurancesService } from './insurances.service';
import { InsurancesController } from './insurances.controller';

@Module({
  providers: [InsurancesService],
  controllers: [InsurancesController],
})
export class InsurancesModule {}
