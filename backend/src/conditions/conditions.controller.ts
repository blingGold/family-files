import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ConditionsService } from './conditions.service';
import { CreateConditionDto, UpdateConditionDto } from './dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller()
export class ConditionsController {
  constructor(private conditions: ConditionsService) {}

  @Get('patients/:patientId/conditions')
  listForPatient(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
  ) {
    return this.conditions.listForPatient(user, Number(patientId));
  }

  @Post('patients/:patientId/conditions')
  create(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreateConditionDto,
  ) {
    return this.conditions.create(user, Number(patientId), dto);
  }

  @Get('conditions/:id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conditions.detail(user, Number(id));
  }

  @Get('conditions/:id/timeline')
  timeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conditions.timeline(user, Number(id));
  }

  @Put('conditions/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateConditionDto,
  ) {
    return this.conditions.update(user, Number(id), dto);
  }

  @Delete('conditions/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conditions.softDelete(user, Number(id));
  }
}
