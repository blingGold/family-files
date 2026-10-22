import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { VaccinesService } from './vaccines.service';
import { VaccineDto } from './dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller()
export class VaccinesController {
  constructor(private vaccines: VaccinesService) {}

  @Get('patients/:patientId/vaccines')
  list(@CurrentUser() user: AuthUser, @Param('patientId') patientId: string) {
    return this.vaccines.list(user, Number(patientId));
  }

  @Post('patients/:patientId/vaccines')
  create(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Body() dto: VaccineDto,
  ) {
    return this.vaccines.create(user, Number(patientId), dto);
  }

  @Put('vaccines/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: VaccineDto) {
    return this.vaccines.update(user, Number(id), dto);
  }

  @Delete('vaccines/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vaccines.remove(user, Number(id));
  }

  @Post('vaccines/:id/complete-next')
  completeNext(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vaccines.completeNext(user, Number(id));
  }
}
