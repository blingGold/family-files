import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private users: UsersService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('用户名或密码错误');

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  /** 修改当前账号密码（旧密码校验、hash 更新在 users 服务内完成） */
  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    return this.users.changeMyPassword(userId, oldPassword, newPassword);
  }
}
