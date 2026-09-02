import type { AnalysisInput, AnalysisResult } from '../types/annotation';

function buildImpactSummary(input: AnalysisInput, risk: string) {
  return `模拟解释：当前设备为${input.deviceType}，分辨率 ${input.resolution}，使用距离 ${input.distance}，使用场景为${input.scenario}，目标人群包含${input.userGroups.join('、') || '未指定用户'}，因此${risk}`;
}

function context(input: AnalysisInput, impact_summary: string) {
  return {
    device_type: input.deviceType,
    resolution: input.resolution,
    viewing_distance: input.distance,
    usage_context: input.scenario,
    target_user_groups: input.userGroups,
    rule_sets: input.ruleSets,
    evaluation_dimensions: input.dimensions,
    impact_summary
  };
}

export async function analyzeDesign(input: AnalysisInput): Promise<AnalysisResult> {
  return {
    annotations: [
      {
        annotation_id: 'ann-1',
        x: 0.24,
        y: 0.22,
        width: 0.34,
        height: 0.08,
        issue_type: 'contrast',
        severity: 'high',
        description: '文本与背景对比不足，强光或低视力场景下存在可读性风险。',
        recommendation: '提升前景与背景的视觉区分，并复核关键文本的对比表现。',
        rule_id: 'L1-WCAG-CONTRAST-MOCK',
        rule_layer: 'L1_HARD_CONSTRAINT',
        reasoning_type: 'rule_match',
        evidence_level: 'standard',
        measurement: {
          metric_name: 'Contrast ratio',
          current_value: '2.8:1',
          threshold_value: '4.5:1',
          recommended_value: '>=4.5:1',
          delta: '-1.7',
          interpretation: '模拟测量：当前对比度低于普通文本可读性建议阈值。'
        },
        source_priority: 1,
        confidence: 0.82,
        target_user_group: ['低视力用户'],
        applied_context: context(input, buildImpactSummary(input, '低对比文本的可读性风险被提高。')),
        contextual_findings: [
          { finding_id: 'cf-1-ordinary', context_type: 'user_group', context_label: '通用用户', suitability: 'acceptable', severity_adjustment: 'none', reason: '室内普通浏览下可读性风险相对可控，但仍建议优化局部对比。', evidence_refs: ['ev-1'] },
          { finding_id: 'cf-1-low-vision', context_type: 'user_group', context_label: '低视力用户', suitability: 'risk', severity_adjustment: 'increase', reason: '低对比文本会提高识别成本，对低视力用户风险更高。', evidence_refs: ['ev-1'], recommendation: '优先提升价格和说明文字的对比度。' },
          { finding_id: 'cf-1-outdoor', context_type: 'usage_context', context_label: '移动端 App - 户外', suitability: 'risk', severity_adjustment: 'increase', reason: '户外强光可能进一步降低屏幕内容辨识度。', evidence_refs: ['ev-1'] },
          { finding_id: 'cf-1-wcag', context_type: 'rule_set', context_label: 'WCAG 2.2', suitability: 'risk', severity_adjustment: 'increase', reason: '示例对比度低于已核验规则摘要中的参考阈值。', evidence_refs: ['ev-1'] }
        ],
        status: 'OPEN',
        conflict_status: 'none',
        evidence: [
          {
            evidence_id: 'ev-1',
            source_name: 'WCAG 2.2',
            source_type: 'standard',
            rule_id: 'L1-WCAG-CONTRAST-MOCK',
            guideline_ref: 'SC 1.4.3 Contrast Minimum',
            summary: '规则摘要：普通文本与背景对比度建议达到可读性阈值；当前模拟结果约 2.8:1，低于 4.5:1 参考值。',
            evidence_level: 'standard',
            reasoning_type: 'rule_match',
            reference_status: 'verified_reference',
            claim_strength: 'strong',
            priority: 1,
            note: 'Mock evidence only.'
          }
        ]
      },
      {
        annotation_id: 'ann-2',
        x: 0.86,
        y: 0.04,
        width: 0.1,
        height: 0.08,
        issue_type: 'touch_target',
        severity: 'medium',
        description: '主操作区域偏小，可能不符合移动平台对可触达目标的设计预期。',
        recommendation: '扩大视觉目标或点击热区，并检查相邻操作之间的可触达间距。',
        rule_id: 'L2-APPLE-TOUCH-TARGET-MOCK',
        rule_layer: 'L2_PLATFORM_GUIDELINE',
        reasoning_type: 'rule_match',
        evidence_level: 'platform_guideline',
        measurement: {
          metric_name: 'Touch target size',
          current_value: '24x24',
          threshold_value: '44x44',
          recommended_value: '>=44x44',
          unit: 'pt',
          delta: '-20',
          interpretation: '模拟测量：当前点击区域低于平台建议参考值，可能增加误触或点不中风险。'
        },
        source_priority: 3,
        confidence: 0.76,
        target_user_group: ['移动端用户'],
        applied_context: context(input, buildImpactSummary(input, '较小点击区域会被标记为更高误触或点不中风险。')),
        contextual_findings: [
          { finding_id: 'cf-2-ordinary', context_type: 'user_group', context_label: '通用用户', suitability: 'risk', severity_adjustment: 'none', reason: '顶部小图标区域较小，普通用户快速点击时仍可能点不中。', evidence_refs: ['ev-2'] },
          { finding_id: 'cf-2-large-finger', context_type: 'user_group', context_label: '手指偏大用户', suitability: 'not_suitable', severity_adjustment: 'increase', reason: '较小触控目标对手指偏大用户更不友好。', evidence_refs: ['ev-2'], recommendation: '扩大图标热区并增加周边留白。' },
          { finding_id: 'cf-2-elderly', context_type: 'user_group', context_label: '老年用户', suitability: 'risk', severity_adjustment: 'increase', reason: '老年用户操作精度和反馈确认成本可能更高。', evidence_refs: ['ev-2'] },
          { finding_id: 'cf-2-apple', context_type: 'rule_set', context_label: 'Apple HIG', suitability: 'unknown', severity_adjustment: 'none', reason: '当前为示例平台依据提示，尚未做完整平台条目核验。', evidence_refs: ['ev-2'] }
        ],
        status: 'OPEN',
        conflict_status: 'none',
        evidence: [
          {
            evidence_id: 'ev-2',
            source_name: 'Apple Human Interface Guidelines',
            source_type: 'platform_guideline',
            rule_id: 'L2-APPLE-TOUCH-TARGET-MOCK',
            guideline_ref: 'Touch Targets',
            summary: '规则摘要：交互控件应提供足够的可点击区域；当前模拟结果约 24x24 pt，低于 44x44 pt 参考值。',
            evidence_level: 'platform_guideline',
            reasoning_type: 'rule_match',
            reference_status: 'example_reference',
            claim_strength: 'moderate',
            priority: 3,
            note: 'Mock evidence only.'
          }
        ]
      },
      {
        annotation_id: 'ann-3',
        x: 0.08,
        y: 0.46,
        width: 0.84,
        height: 0.14,
        issue_type: 'cognitive_load',
        severity: 'medium',
        description: '关键区域信息密度较高，首次使用时理解和决策成本偏高。',
        recommendation: '减少同屏决策点，按任务优先级重组信息层级。',
        rule_id: 'L3-COGLOAD-MOCK',
        rule_layer: 'L3_HUMAN_FACTORS',
        reasoning_type: 'theory_inference',
        evidence_level: 'theory',
        measurement: {
          metric_name: 'Visible decision points',
          current_value: 9,
          threshold_value: 5,
          recommended_value: '<=5',
          unit: 'items',
          delta: 4,
          interpretation: '模拟测量：当前同屏决策点较多，可能增加理解和选择负担。'
        },
        source_priority: 4,
        confidence: 0.74,
        target_user_group: ['新手用户', '老年人'],
        applied_context: context(input, buildImpactSummary(input, '同屏决策点较多会被标记为更高理解和选择负担。')),
        contextual_findings: [
          { finding_id: 'cf-3-new-user', context_type: 'user_group', context_label: '新手用户', suitability: 'risk', severity_adjustment: 'increase', reason: '首次使用时需要同时理解较多信息块，学习成本偏高。', evidence_refs: ['ev-3'] },
          { finding_id: 'cf-3-elderly', context_type: 'user_group', context_label: '老年用户', suitability: 'risk', severity_adjustment: 'increase', reason: '信息密度高会增加扫视和记忆负担。', evidence_refs: ['ev-3'] },
          { finding_id: 'cf-3-human-factors', context_type: 'rule_set', context_label: 'Human Factors', suitability: 'risk', severity_adjustment: 'increase', reason: '该结论是理论推断风险，不是规范违反。', evidence_refs: ['ev-3'] }
        ],
        status: 'OPEN',
        conflict_status: 'none',
        evidence: [
          {
            evidence_id: 'ev-3',
            source_name: 'Cognitive Load Theory',
            source_type: 'theory',
            rule_id: 'L3-COGLOAD-MOCK',
            guideline_ref: 'Theory reference',
            summary: '规则摘要：同屏决策点越多，用户理解和选择负担可能越高；当前模拟结果为 9 个，高于 5 个参考阈值。',
            evidence_level: 'theory',
            reasoning_type: 'theory_inference',
            reference_status: 'example_reference',
            claim_strength: 'moderate',
            priority: 4,
            note: 'Mock evidence only.'
          }
        ]
      },
      {
        annotation_id: 'ann-4',
        x: 0.1,
        y: 0.62,
        width: 0.66,
        height: 0.1,
        issue_type: 'spacing',
        severity: 'medium',
        description: '操作选项间距偏小，在快速触控时可能存在误触相邻选项的风险。',
        recommendation: '增加相邻选项之间的安全间距，保持清晰的点击热区隔离。',
        rule_id: 'L2-ANDROID-SPACING-MOCK',
        rule_layer: 'L2_PLATFORM_GUIDELINE',
        reasoning_type: 'rule_match',
        evidence_level: 'platform_guideline',
        measurement: {
          metric_name: 'Touch target spacing',
          current_value: 4,
          threshold_value: 8,
          recommended_value: '>=8',
          unit: 'dp',
          delta: -4,
          interpretation: '模拟测量：相邻选项间距低于平台建议的安全间距。'
        },
        source_priority: 3,
        confidence: 0.75,
        target_user_group: ['移动端用户', '手指偏大用户'],
        applied_context: context(input, buildImpactSummary(input, '较小间距会增加连续操作时的误触风险。')),
        contextual_findings: [
          { finding_id: 'cf-4-ordinary', context_type: 'user_group', context_label: '通用用户', suitability: 'acceptable', severity_adjustment: 'none', reason: '普通浏览下误触概率相对可控，但连续点击时仍建议保持安全间距。', evidence_refs: ['ev-4'] },
          { finding_id: 'cf-4-large-finger', context_type: 'user_group', context_label: '手指偏大用户', suitability: 'risk', severity_adjustment: 'increase', reason: '手指偏大用户在小间距排列下容易误选相邻选项。', evidence_refs: ['ev-4'], recommendation: '增大选项间距并优化选中态反馈。' },
          { finding_id: 'cf-4-android', context_type: 'rule_set', context_label: 'Android Accessibility', suitability: 'risk', severity_adjustment: 'increase', reason: '当前间距低于平台无障碍指南中关于触控间距的推荐值。', evidence_refs: ['ev-4'] }
        ],
        status: 'OPEN',
        conflict_status: 'none',
        evidence: [
          {
            evidence_id: 'ev-4',
            source_name: 'Android Accessibility Guidelines',
            source_type: 'platform_guideline',
            rule_id: 'L2-ANDROID-SPACING-MOCK',
            guideline_ref: 'Target Spacing and Touch Targets',
            summary: '规则摘要：交互元素之间应保持足够的边缘间距以降低误触风险；当前模拟间距为 4 dp，低于 8 dp 参考值。',
            evidence_level: 'platform_guideline',
            reasoning_type: 'rule_match',
            reference_status: 'example_reference',
            claim_strength: 'moderate',
            priority: 3,
            note: 'Mock evidence only.'
          }
        ]
      },
      {
        annotation_id: 'ann-5',
        x: 0.08,
        y: 0.86,
        width: 0.84,
        height: 0.1,
        issue_type: 'touch_target',
        severity: 'high',
        description: '底部主操作按钮与相邻区域过近，快速操作时可能增加误触风险。',
        recommendation: '增加主操作按钮高度和周边留白，避免与次级操作或系统手势区域冲突。',
        rule_id: 'L3-FITTS-SPACING-MOCK',
        rule_layer: 'L3_HUMAN_FACTORS',
        reasoning_type: 'theory_inference',
        evidence_level: 'theory',
        measurement: {
          metric_name: 'Bottom action target height',
          current_value: 36,
          threshold_value: 48,
          recommended_value: '>=48',
          unit: 'dp',
          delta: -12,
          interpretation: '模拟测量：底部主操作区域高度偏小，快速点击时命中稳定性下降。'
        },
        source_priority: 4,
        confidence: 0.72,
        target_user_group: ['移动端用户', '手指偏大用户'],
        applied_context: context(input, buildImpactSummary(input, '底部主操作区域需要更高的命中稳定性。')),
        contextual_findings: [
          { finding_id: 'cf-5-large-finger', context_type: 'user_group', context_label: '手指偏大用户', suitability: 'not_suitable', severity_adjustment: 'increase', reason: '底部操作区偏小会增加点不中或误触概率。', evidence_refs: ['ev-5'], recommendation: '提高按钮高度并增加安全间距。' },
          { finding_id: 'cf-5-vehicle', context_type: 'usage_context', context_label: '车机行驶中', suitability: 'not_suitable', severity_adjustment: 'increase', reason: '行驶中操作需要更低操作负荷和更高命中稳定性。', evidence_refs: ['ev-5'] },
          { finding_id: 'cf-5-fitts', context_type: 'rule_set', context_label: 'Fitts Law', suitability: 'risk', severity_adjustment: 'increase', reason: '该结论为理论推断风险，不是规范违反。', evidence_refs: ['ev-5'] }
        ],
        status: 'OPEN',
        conflict_status: 'none',
        evidence: [
          {
            evidence_id: 'ev-5',
            source_name: 'Fitts Law',
            source_type: 'theory',
            rule_id: 'L3-FITTS-SPACING-MOCK',
            guideline_ref: 'Target acquisition theory reference',
            summary: '规则摘要：目标越小、操作距离越远，稳定命中成本越高；当前模拟按钮高度 36 dp，低于 48 dp 参考值。',
            evidence_level: 'theory',
            reasoning_type: 'theory_inference',
            reference_status: 'example_reference',
            claim_strength: 'moderate',
            priority: 4,
            note: 'Mock evidence only.'
          }
        ]
      }
    ]
  };
}
