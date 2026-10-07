import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller('attachments')
export class AttachmentsController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private uploadDir() {
    const dir = this.config.get<string>('UPLOAD_DIR') || './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = process.env.UPLOAD_DIR || './uploads';
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('只允许上传图片'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async upload(@CurrentUser() _user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('未收到文件');
    const record = await this.prisma.attachment.create({
      data: {
        fileName: file.originalname,
        filePath: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
    return { id: record.id, fileName: record.fileName, url: `/api/attachments/${record.id}` };
  }

  @Get(':id')
  async download(@CurrentUser() _user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const att = await this.prisma.attachment.findUnique({ where: { id: Number(id) } });
    if (!att) return res.status(404).send('not found');
    const full = path.join(this.uploadDir(), att.filePath);
    if (!fs.existsSync(full)) return res.status(404).send('file missing');
    res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(att.fileName)}"`);
    fs.createReadStream(full).pipe(res);
  }
}
