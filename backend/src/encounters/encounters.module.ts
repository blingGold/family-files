import { Module } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { EncountersController } from './encounters.controller';

@Module({
  providers: [EncountersService],
  controllers: [EncountersController],
})
export class EncountersModule {}
