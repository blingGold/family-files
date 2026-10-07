import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { FollowUpsService } from './followups.service';
import { CompleteFollowUpDto, UpdateFollowUpDto, CreateFollowUpDto } from './dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller()
export class FollowUpsController {
  constructor(private followups: FollowUpsService) {}

  @Get('followups')
  list(
    @CurrentUser() user: AuthUser,
    @Query('scope') scope: 'all' | 'patient' = 'all',
    @Query('patientId') patientId?: string,
  ) {
    return this.followups.list(user, scope, patientId ? Number(patientId) : undefined);
  }

  @Get('followups/badge')
  badge(@CurrentUser() user: AuthUser) {
    return this.followups.badgeCount(user);
  }

  @Post('conditions/:conditionId/followups')
  create(
    @CurrentUser() user: AuthUser,
    @Param('conditionId') conditionId: string,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.followups.create(user, Number(conditionId), dto);
  }

  @Post('followups/:id/complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CompleteFollowUpDto,
  ) {
    return this.followups.complete(user, Number(id), dto);
  }

  @Put('followups/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.followups.update(user, Number(id), dto);
  }

  @Delete('followups/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.followups.remove(user, Number(id));
  }
}
