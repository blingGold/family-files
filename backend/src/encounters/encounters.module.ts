import { Module } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { EncountersController } from './encounters.controller';
import { ConditionsModule } from '../conditions/conditions.module';

@Module({
  imports: [ConditionsModule],
  providers: [EncountersService],
  controllers: [EncountersController],
})
export class EncountersModule {}
