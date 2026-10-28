import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    // 附件图片用 <img src> 展示，无法带 Authorization 头；允许 GET /api/attachments/:id 通过 ?token= 查询参数携带令牌
    const req = context.switchToHttp().getRequest();
    const isAttachmentView = req.method === 'GET' && /^\/api\/attachments\/\d+$/.test(req.path || '');
    if (isAttachmentView && !req.headers?.authorization && req.query?.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    return super.canActivate(context);
  }
}
