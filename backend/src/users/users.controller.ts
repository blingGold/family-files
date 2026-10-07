import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, SetAccessDto } from './dto/users.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  private assertAdmin(user: AuthUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('需要管理员权限');
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    this.assertAdmin(user);
    return this.users.list();
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    this.assertAdmin(user);
    return this.users.create(dto);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    this.assertAdmin(user);
    return this.users.update(Number(id), dto);
  }

  @Post(':id/access')
  setAccess(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetAccessDto) {
    this.assertAdmin(user);
    return this.users.setAccess(Number(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.assertAdmin(user);
    return this.users.remove(Number(id), user);
  }

  @Get('me/patients')
  myPatients(@CurrentUser() user: AuthUser) {
    return this.users.listForUser(user.id);
  }
}
