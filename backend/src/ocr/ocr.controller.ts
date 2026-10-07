import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

const TMP_DIR = path.join(process.cwd(), 'uploads/ocr_tmp');

// OpenAI 兼容的视觉大模型调用，用于图片文字识别（OCR）
// 配置见 backend/.env：
//   OCR_API_BASE  默认 https://ark.cn-beijing.volces.com/api/v3（火山引擎豆包）
//   OCR_API_KEY   必填，大模型平台 API Key
//   OCR_MODEL     模型名或推理接入点 ID，如 doubao-1.5-vision-pro-32k-250115
@Controller('ocr')
export class OcrController {
  constructor(private config: ConfigService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
          cb(null, TMP_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('只支持图片文件'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async recognize(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('未收到图片');

    const apiKey = this.config.get<string>('OCR_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'OCR 大模型未配置：请在 backend/.env 中设置 OCR_API_KEY / OCR_MODEL',
      );
    }

    const full = path.join(TMP_DIR, file.filename);
    try {
      const base64 = fs.readFileSync(full).toString('base64');
      const mime = file.mimetype || 'image/jpeg';
      const text = await this.callVisionModel(apiKey, base64, mime);
      return { text, parsed: this.parseStructured(text) };
    } catch (e: any) {
      throw new BadRequestException(`OCR 识别失败：${e?.message || '未知错误'}`);
    } finally {
      try {
        fs.unlinkSync(full);
      } catch {
        /* ignore */
      }
    }
  }

  /** 从模型输出中容错解析 JSON（可能带前后解释文字/markdown 代码块） */
  private parseStructured(text: string): any | null {
    if (!text) return null;
    let t = text.trim();
    // 去掉 markdown 代码块围栏
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    // 取第一个 { ... } 块
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      const obj = JSON.parse(t.slice(start, end + 1));
      if (typeof obj === 'object' && obj !== null) return obj;
      return null;
    } catch {
      return null;
    }
  }

  private async callVisionModel(apiKey: string, base64: string, mime: string): Promise<string> {
    const apiBase = this.config.get<string>('OCR_API_BASE') || 'https://ark.cn-beijing.volces.com/api/v3';
    const model = this.config.get<string>('OCR_MODEL') || 'doubao-1.5-vision-pro-32k-250115';

    const res = await fetch(`${apiBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mime};base64,${base64}` },
              },
              {
                type: 'text',
                text:
                  '你是医疗文档信息提取助手。请识别图片中的全部文字，并从中提取以下字段，' +
                  '只输出一个 JSON 对象（不要输出任何其他文字或解释），格式如下：\n' +
                  '{\n' +
                  '  "disease": "诊断/印象诊断中的主要疾病名称；若有多项只取第一项主要疾病（如\"脑血管病；动脉粥样硬化并高脂血症\"只取\"脑血管病\"；图片中未出现则为空字符串）",\n' +
                  '  "aliases": "疾病的其他称呼（未出现则为空字符串）",\n' +
                  '  "advice": "医生医嘱内容（未出现则为空字符串）",\n' +
                  '  "examSuggest": "检查建议（未出现则为空字符串）",\n' +
                  '  "examResult": "检查结果（未出现则为空字符串）",\n' +
                  '  "medication": "用药建议（未出现则为空字符串）",\n' +
                  '  "followUpDate": "下次复查/复诊日期（如医嘱中明确写了复查日期；未出现则为空字符串），格式 YYYY-MM-DD",\n' +
                  '  "followUpItems": "复查项目（未出现则为空字符串）",\n' +
                  '  "hospital": "就诊医院名称（未出现则为空字符串）",\n' +
                  '  "doctor": "就诊医生姓名（未出现则为空字符串）",\n' +
                  '  "visitDate": "就诊/病历日期，格式 YYYY-MM-DD（未出现则为空字符串）"\n' +
                  '}\n' +
                  '注意：只输出 JSON 本身，不要用 markdown 代码块包裹。',
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`大模型接口 ${res.status}: ${body.slice(0, 200)}`);
    }
    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('大模型未返回文本');
    }
    return text.trim();
  }
}
