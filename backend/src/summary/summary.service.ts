import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class SummaryService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private config: ConfigService,
  ) {}

  /** 选取的就诊记录 → 大模型总结为 Markdown（复用 OCR 的 DeepSeek 配置） */
  async summarizeCondition(
    user: AuthUser,
    conditionId: number,
    encounterIds?: number[],
  ) {
    const c = await this.prisma.condition.findUnique({
      where: { id: conditionId },
      include: { patient: true },
    });
    if (!c) throw new NotFoundException('疾病不存在');
    await this.access.assertCanAccess(user, c.patientId);

    const where: any = { conditionId };
    if (encounterIds && encounterIds.length) {
      where.id = { in: encounterIds };
    }
    const encounters = await this.prisma.encounter.findMany({
      where,
      orderBy: { encounterDate: 'asc' },
      include: { exams: true, medications: true },
    });
    if (!encounters.length) {
      throw new BadRequestException('所选范围内没有就诊记录');
    }

    const apiKey = this.config.get<string>('OCR_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('大模型未配置：请在 backend/.env 中设置 OCR_API_KEY / OCR_MODEL');
    }

    const context = this.buildContext(c, encounters);
    const summary = await this.callLlm(apiKey, context);
    return { summary, count: encounters.length };
  }

  private buildContext(c: any, encounters: any[]): string {
    const p = c.patient || {};
    const lines: string[] = [];
    lines.push(`家庭病历 · 疾病：${c.name}（其他称呼：${c.aliases || '无'}）`);
    lines.push(`患者：${p.name || '未知'}${p.birthDate ? '，出生 ' + new Date(p.birthDate).toLocaleDateString('zh-CN') : ''}${p.heightCm ? `，身高 ${p.heightCm}cm` : ''}${p.weightKg ? `，体重 ${p.weightKg}kg` : ''}`);
    lines.push(`疾病状态：${c.status === 'ACTIVE' ? '治疗中' : c.status === 'FOLLOW_UP' ? '随访中' : c.status === 'CHRONIC' ? '慢性管理' : c.status}`);
    if (c.advice) lines.push(`医嘱汇总：${c.advice}`);
    if (c.examSuggest) lines.push(`检查建议：${c.examSuggest}`);
    if (c.examResult) lines.push(`检查结果汇总：${c.examResult}`);
    if (c.medication) lines.push(`用药建议汇总：${c.medication}`);
    lines.push('');
    lines.push(`共 ${encounters.length} 条就诊记录：`);
    for (const e of encounters) {
      lines.push('');
      lines.push(`## ${new Date(e.encounterDate).toLocaleDateString('zh-CN')}${e.hospital ? ' ' + e.hospital : ''}${e.doctor ? ' ' + e.doctor + '医生' : ''}`);
      if (e.diagnosis) lines.push(`诊断：${e.diagnosis}`);
      if (e.chiefComplaint) lines.push(`主诉：${e.chiefComplaint}`);
      if (e.advice) lines.push(`医嘱：${e.advice}`);
      if (e.exams?.length) {
        lines.push('检查：');
        for (const x of e.exams) {
          lines.push(`- ${x.name}${x.resultValue ? ' ' + x.resultValue : ''}${x.conclusion ? '（' + x.conclusion + '）' : ''}`);
        }
      }
      if (e.medications?.length) {
        lines.push('用药：');
        for (const m of e.medications) {
          lines.push(`- ${m.name}${m.dosage ? ' ' + m.dosage : ''}${m.frequency ? '，' + m.frequency : ''}`);
        }
      }
      if (e.notes) lines.push(`备注：${e.notes}`);
    }
    return lines.join('\n');
  }

  private async callLlm(apiKey: string, context: string): Promise<string> {
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
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  '你是家庭病历管理助手，面向普通家庭成员。以下是围绕某种疾病的历次就诊原始记录。' +
                  '请输出一份通俗易懂、结构清晰的中文 Markdown 总结，包含以下小节：\n' +
                  '1. **疾病概况**（疾病与分类、当前状态）\n' +
                  '2. **历次就诊要点**（按时间列出每次就诊的核心信息）\n' +
                  '3. **检查与指标变化**（如多次做同一检查，对比数值变化；无则写"暂无对比数据"）\n' +
                  '4. **用药史**（药物、用法，是否调整；无则写"暂无记录"）\n' +
                  '5. **医嘱与注意事项**（无则写"暂无记录"）\n' +
                  '6. **下一步建议**（根据最近复查计划和医嘱推断；信息不足时建议"遵医嘱复查并咨询医生"，不要编造）\n' +
                  '要求：只基于给定记录，不编造任何未出现的信息；缺失信息明确标注"暂无记录"。\n\n' +
                  '以下是原始记录：\n' +
                  '====\n' +
                  context +
                  '\n====',
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
