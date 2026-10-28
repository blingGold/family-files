import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
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
import { AccessService } from '../common/access.service';

@Controller('attachments')
export class AttachmentsController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private access: AccessService,
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
        const ext = path.extname(file.originalname).toLowerCase();
        const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'];
        // 微信/部分安卓 WebView 上传的图片 mimetype 可能为空或 octet-stream，按扩展名兜底
        if (!file.mimetype.startsWith('image/') && !imgExts.includes(ext)) {
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

  /** 就诊记录：按分类上传图片（如影像、抽血结果、B超结果等），一次一张、可多次传 */
  @Post('encounters/:id/attachments')
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
        const ext = path.extname(file.originalname).toLowerCase();
        const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'];
        // 微信/部分安卓 WebView 上传的图片 mimetype 可能为空或 octet-stream，按扩展名兜底
        if (!file.mimetype.startsWith('image/') && !imgExts.includes(ext)) {
          cb(new BadRequestException('只允许上传图片'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadForEncounter(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('category') category: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('未收到文件');
    const enc = await this.prisma.encounter.findFirst({ where: { id: Number(id), deletedAt: null } });
    if (!enc) throw new NotFoundException('就诊不存在');
    await this.access.assertCanAccess(user, enc.patientId);
    const record = await this.prisma.attachment.create({
      data: {
        fileName: file.originalname,
        filePath: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        encounterId: enc.id,
        category: category?.trim() || '其他',
      },
    });
    return { id: record.id, fileName: record.fileName, category: record.category, url: `/api/attachments/${record.id}` };
  }

  /** 疾病档案：按分类上传图片（确诊依据等） */
  @Post('conditions/:id/attachments')
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
        const ext = path.extname(file.originalname).toLowerCase();
        const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'];
        // 微信/部分安卓 WebView 上传的图片 mimetype 可能为空或 octet-stream，按扩展名兜底
        if (!file.mimetype.startsWith('image/') && !imgExts.includes(ext)) {
          cb(new BadRequestException('只允许上传图片'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadForCondition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('category') category: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('未收到文件');
    const c = await this.prisma.condition.findFirst({ where: { id: Number(id), deletedAt: null } });
    if (!c) throw new NotFoundException('疾病不存在');
    await this.access.assertCanAccess(user, c.patientId);
    const record = await this.prisma.attachment.create({
      data: {
        fileName: file.originalname,
        filePath: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        conditionId: c.id,
        category: category?.trim() || '其他',
      },
    });
    return { id: record.id, fileName: record.fileName, category: record.category, url: `/api/attachments/${record.id}` };
  }

  /** 删除附件（校验所属就诊/检查/手术/保险/疾病的病人访问权限，物理删除文件与记录） */
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id: Number(id) } });
    if (!att) throw new NotFoundException('附件不存在');
    let patientId: number | null = null;
    if (att.conditionId) {
      const c = await this.prisma.condition.findUnique({ where: { id: att.conditionId } });
      patientId = c?.patientId ?? null;
    }
    if (patientId === null && att.encounterId) {
      const enc = await this.prisma.encounter.findUnique({ where: { id: att.encounterId } });
      patientId = enc?.patientId ?? null;
    }
    if (patientId === null && att.examId) {
      const ex = await this.prisma.exam.findUnique({ where: { id: att.examId }, include: { encounter: true } });
      patientId = ex?.encounter?.patientId ?? null;
    }
    if (patientId === null && att.procedureId) {
      const pr = await this.prisma.procedure.findUnique({ where: { id: att.procedureId }, include: { encounter: true } });
      patientId = pr?.encounter?.patientId ?? null;
    }
    if (patientId === null && att.insuranceId) {
      const ins = await this.prisma.insurance.findUnique({ where: { id: att.insuranceId } });
      patientId = ins?.patientId ?? null;
    }
    if (patientId !== null) await this.access.assertCanAccess(user, patientId);
    const full = path.join(this.uploadDir(), att.filePath);
    try { fs.unlinkSync(full); } catch { /* 文件已缺失则忽略 */ }
    await this.prisma.attachment.delete({ where: { id: att.id } });
    return { ok: true };
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
