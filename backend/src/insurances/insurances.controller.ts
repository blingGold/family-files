import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { InsurancesService } from './insurances.service';
import { InsuranceDto } from './dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller()
export class InsurancesController {
  constructor(private insurances: InsurancesService) {}

  @Get('patients/:patientId/insurances')
  list(@CurrentUser() user: AuthUser, @Param('patientId') patientId: string) {
    return this.insurances.list(user, Number(patientId));
  }

  @Post('patients/:patientId/insurances')
  create(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Body() dto: InsuranceDto,
  ) {
    return this.insurances.create(user, Number(patientId), dto);
  }

  @Put('insurances/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InsuranceDto) {
    return this.insurances.update(user, Number(id), dto);
  }
}
