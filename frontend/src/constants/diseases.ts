// 常见疾病枚举：选中自动带出默认其他称呼（可修改）
export interface DiseasePreset {
  name: string;
  aliases: string;
  category: string;
}

export const CUSTOM_DISEASE = '__custom__';

/** 从 OCR 文本中匹配疾病枚举：命中名称或任一称呼 */
export function matchDisease(text: string): DiseasePreset | null {
  for (const d of DISEASE_PRESETS) {
    if (text.includes(d.name)) return d;
    for (const a of d.aliases.split(',')) {
      if (a && text.includes(a.trim())) return d;
    }
  }
  return null;
}

export const DISEASE_CATEGORIES = [
  '心血管',
  '内分泌代谢',
  '消化系统',
  '呼吸系统',
  '神经精神',
  '骨骼关节',
  '泌尿肾脏',
  '五官皮肤',
  '血液免疫',
  '肿瘤结节',
  '妇科',
  '其他',
];

export const DISEASE_PRESETS: DiseasePreset[] = [
  // 心血管
  { name: '高血压', aliases: '血压高,原发性高血压', category: '心血管' },
  { name: '冠心病', aliases: '冠状动脉粥样硬化性心脏病', category: '心血管' },
  { name: '脑卒中', aliases: '中风,脑血管意外,CVA,脑血管病,脑梗死', category: '心血管' },
  { name: '心力衰竭', aliases: '心衰,心功能不全', category: '心血管' },
  { name: '心房颤动', aliases: '房颤', category: '心血管' },
  { name: '心肌梗死', aliases: '心梗,急性心肌梗死', category: '心血管' },
  { name: '心律失常', aliases: '心律不齐', category: '心血管' },
  { name: '动脉粥样硬化', aliases: '粥样硬化', category: '心血管' },
  { name: '下肢静脉曲张', aliases: '静脉曲张', category: '心血管' },

  // 内分泌代谢
  { name: '2型糖尿病', aliases: '糖尿病,II型糖尿病', category: '内分泌代谢' },
  { name: '1型糖尿病', aliases: '糖尿病,I型糖尿病', category: '内分泌代谢' },
  { name: '糖尿病前期', aliases: '糖前期,IGT,空腹血糖受损', category: '内分泌代谢' },
  { name: '高脂血症', aliases: '血脂异常,高血脂', category: '内分泌代谢' },
  { name: '甲状腺功能亢进', aliases: '甲亢', category: '内分泌代谢' },
  { name: '甲状腺功能减退', aliases: '甲减', category: '内分泌代谢' },
  { name: '痛风', aliases: '高尿酸血症', category: '内分泌代谢' },
  { name: '肥胖症', aliases: '肥胖', category: '内分泌代谢' },
  { name: '代谢综合征', aliases: '代谢异常', category: '内分泌代谢' },

  // 消化系统
  { name: '慢性胃炎', aliases: '胃炎,浅表性胃炎', category: '消化系统' },
  { name: '胃溃疡', aliases: '消化性溃疡,胃十二指肠溃疡', category: '消化系统' },
  { name: '胃食管反流病', aliases: '反流性食管炎,胃酸反流', category: '消化系统' },
  { name: '脂肪肝', aliases: '非酒精性脂肪肝,NAFLD', category: '消化系统' },
  { name: '肝硬化', aliases: '肝纤维化', category: '消化系统' },
  { name: '乙型肝炎', aliases: '乙肝,慢性乙肝,HBV', category: '消化系统' },
  { name: '胆囊炎', aliases: '慢性胆囊炎', category: '消化系统' },
  { name: '胆结石', aliases: '胆囊结石,胆石症', category: '消化系统' },
  { name: '肠易激综合征', aliases: 'IBS,肠道功能紊乱', category: '消化系统' },
  { name: '慢性便秘', aliases: '便秘', category: '消化系统' },

  // 呼吸系统
  { name: '支气管哮喘', aliases: '哮喘', category: '呼吸系统' },
  { name: '慢性阻塞性肺疾病', aliases: '慢阻肺,COPD', category: '呼吸系统' },
  { name: '慢性支气管炎', aliases: '老慢支', category: '呼吸系统' },
  { name: '肺结节', aliases: '肺部结节,肺占位', category: '呼吸系统' },
  { name: '肺炎', aliases: '肺部感染', category: '呼吸系统' },
  { name: '睡眠呼吸暂停综合征', aliases: '鼾症,OSA,打呼噜', category: '呼吸系统' },
  { name: '肺结核', aliases: '结核病,肺痨', category: '呼吸系统' },

  // 神经精神
  { name: '帕金森病', aliases: '震颤麻痹', category: '神经精神' },
  { name: '阿尔茨海默病', aliases: '老年痴呆,AD', category: '神经精神' },
  { name: '偏头痛', aliases: '血管性头痛', category: '神经精神' },
  { name: '癫痫', aliases: '羊癫疯', category: '神经精神' },
  { name: '抑郁症', aliases: '抑郁障碍', category: '神经精神' },
  { name: '焦虑症', aliases: '广泛性焦虑障碍', category: '神经精神' },
  { name: '失眠症', aliases: '睡眠障碍,入睡困难', category: '神经精神' },

  // 骨骼关节
  { name: '骨质疏松', aliases: '骨松,骨质疏鬆', category: '骨骼关节' },
  { name: '骨关节炎', aliases: '退行性关节炎,骨质增生', category: '骨骼关节' },
  { name: '类风湿关节炎', aliases: '类风湿,RA', category: '骨骼关节' },
  { name: '腰椎间盘突出', aliases: '腰突,腰椎间盘突出症', category: '骨骼关节' },
  { name: '颈椎病', aliases: '颈椎间盘突出', category: '骨骼关节' },
  { name: '肩周炎', aliases: '冻结肩', category: '骨骼关节' },
  { name: '强直性脊柱炎', aliases: 'AS', category: '骨骼关节' },

  // 泌尿肾脏
  { name: '慢性肾病', aliases: '慢性肾脏病,CKD', category: '泌尿肾脏' },
  { name: '肾结石', aliases: '尿路结石,肾盏结石', category: '泌尿肾脏' },
  { name: '前列腺增生', aliases: '前列腺肥大,BPH', category: '泌尿肾脏' },
  { name: '尿路感染', aliases: '泌尿系感染', category: '泌尿肾脏' },

  // 五官皮肤
  { name: '白内障', aliases: '老年性白内障', category: '五官皮肤' },
  { name: '青光眼', aliases: '眼压高', category: '五官皮肤' },
  { name: '黄斑变性', aliases: '老年性黄斑变性,AMD', category: '五官皮肤' },
  { name: '听力下降', aliases: '耳聋,听力减退,耳鸣', category: '五官皮肤' },
  { name: '过敏性鼻炎', aliases: '变应性鼻炎,花粉症', category: '五官皮肤' },
  { name: '湿疹', aliases: '特应性皮炎', category: '五官皮肤' },
  { name: '荨麻疹', aliases: '风疹块', category: '五官皮肤' },
  { name: '带状疱疹', aliases: '缠腰龙,蛇缠腰', category: '五官皮肤' },

  // 血液免疫
  { name: '贫血', aliases: '缺铁性贫血', category: '血液免疫' },
  { name: '血小板减少', aliases: 'ITP,血小板减少症', category: '血液免疫' },
  { name: '干燥综合征', aliases: '口干综合征', category: '血液免疫' },
  { name: '系统性红斑狼疮', aliases: 'SLE,红斑狼疮', category: '血液免疫' },

  // 肿瘤结节
  { name: '甲状腺结节', aliases: '甲状腺肿物', category: '肿瘤结节' },
  { name: '乳腺结节', aliases: '乳腺增生', category: '肿瘤结节' },
  { name: '子宫肌瘤', aliases: '子宫平滑肌瘤', category: '肿瘤结节' },
  { name: '肺癌', aliases: '肺部恶性肿瘤', category: '肿瘤结节' },
  { name: '胃癌', aliases: '胃恶性肿瘤', category: '肿瘤结节' },
  { name: '结直肠癌', aliases: '大肠癌,肠癌', category: '肿瘤结节' },
  { name: '肝癌', aliases: '肝恶性肿瘤', category: '肿瘤结节' },
  { name: '乳腺癌', aliases: '乳腺恶性肿瘤', category: '肿瘤结节' },
  { name: '前列腺癌', aliases: '前列腺恶性肿瘤', category: '肿瘤结节' },

  // 妇科
  { name: '更年期综合征', aliases: '围绝经期综合征', category: '妇科' },
  { name: '多囊卵巢综合征', aliases: 'PCOS', category: '妇科' },
  { name: '宫颈炎', aliases: '慢性宫颈炎', category: '妇科' },
  { name: '盆腔炎', aliases: '盆腔炎性疾病', category: '妇科' },

  // 其他
  { name: '幽门螺杆菌感染', aliases: 'Hp感染,幽门螺旋杆菌', category: '其他' },
  { name: '维生素D缺乏', aliases: '缺钙,VD缺乏', category: '其他' },
];
