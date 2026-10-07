import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { CreateEncounterDto, UpdateEncounterDto } from './dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller()
export class EncountersController {
  constructor(private encounters: EncountersService) {}

  @Post('conditions/:conditionId/encounters')
  create(
    @CurrentUser() user: AuthUser,
    @Param('conditionId') conditionId: string,
    @Body() dto: CreateEncounterDto,
  ) {
    return this.encounters.create(user, Number(conditionId), dto);
  }

  @Get('encounters/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.encounters.get(user, Number(id));
  }

  @Put('encounters/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEncounterDto,
  ) {
    return this.encounters.update(user, Number(id), dto);
  }
}
