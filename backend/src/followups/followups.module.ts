import { Module } from '@nestjs/common';
import { FollowUpsService } from './followups.service';
import { FollowUpsController } from './followups.controller';

@Module({
  providers: [FollowUpsService],
  controllers: [FollowUpsController],
})
export class FollowUpsModule {}
