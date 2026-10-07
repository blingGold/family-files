import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class SummaryController {
  constructor(private summary: SummaryService) {}

  @Post('conditions/:conditionId/export-summary')
  summarize(
    @CurrentUser() user: AuthUser,
    @Param('conditionId') conditionId: string,
    @Body() body: { encounterIds?: number[] },
  ) {
    return this.summary.summarizeCondition(
      user,
      Number(conditionId),
      body?.encounterIds,
    );
  }
}
