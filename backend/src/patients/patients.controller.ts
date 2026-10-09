import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto } from './dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller('patients')
export class PatientsController {
  constructor(private patients: PatientsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.patients.list(user);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.patients.detail(user, Number(id));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patients.create(user, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patients.update(user, Number(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.patients.softDelete(user, Number(id));
  }

  /** 手动编辑病人当前用药列表 */
  @Put(':id/medications')
  updateMedications(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('medications') medications: any[],
  ) {
    return this.patients.updateMedications(user, Number(id), medications);
  }
}
