export interface ContextualDefinition {
  id: string;
  label: string;
  english_label: string;
  plain_definition: string;
  why_it_matters: string;
  caution: string;
  reference_id?: string;
  reference_label?: string;
}

export const definitionRegistry: Record<string, ContextualDefinition> = {
  // --- Area & Size ---
  visual_area: {
    id: "visual_area",
    label: "可视面积",
    english_label: "Visual Area",
    plain_definition: "元素在当前图像中所占据的可见矩形面积（宽 × 高）。",
    why_it_matters: "帮助量化图标、按钮或文字本身的视觉体量及其在界面中的空间占比。",
    caution: "可视面积仅代表用户肉眼看到的内容范围，不一定等同于实际可点击的触发面积。"
  },
  touch_area: {
    id: "touch_area",
    label: "触控面积",
    english_label: "Touch Area",
    plain_definition: "用户点击或开始手势操作时能够触发交互的区域面积。",
    why_it_matters: "直接决定交互目标的易点按程度与误触风险，小图标通常搭配更大的透明触控区域。",
    caution: "静态截图无法自动识别透明扩展区域，本工具支持平台建议区域、可视区域推定与用户手动调整。"
  },
  minimum_side: {
    id: "minimum_side",
    label: "短边尺寸",
    english_label: "Minimum Side",
    plain_definition: "控件宽度和高度中数值较小的一边（min(w, h)）。",
    why_it_matters: "手指触控通常受限于最窄边，细长条形或过窄元素容易导致手指无法稳定命中。",
    caution: "短边尺寸用于快速检查尺寸瓶颈，但不能单独替代全面的目标尺寸与间距评估。"
  },
  screen_share: {
    id: "screen_share",
    label: "屏幕占比",
    english_label: "Screen Area Share",
    plain_definition: "元素可视面积占整机完整屏幕物理面积的百分比。",
    why_it_matters: "用于衡量重要元素在完整设备视口中的视觉权重与层级关系。",
    caution: "仅在完整屏幕截图且屏幕分辨率匹配时计算；局部截图不能误标为屏幕占比。"
  },
  image_share: {
    id: "image_share",
    label: "当前截图占比",
    english_label: "Image Area Share",
    plain_definition: "元素可视面积占当前上传截图总像素面积的百分比。",
    why_it_matters: "反映元素在当前局部截图或卡片组件内的相对空间比重。",
    caution: "局部截图无法推断在整机屏幕中的真实占比，请勿将其等同于完整视口占比。"
  },
  nearest_touch_spacing: {
    id: "nearest_touch_spacing",
    label: "相邻触控间距",
    english_label: "Nearest Touch Spacing",
    plain_definition: "当前触控区域与距离最近的另一个触控目标边界之间的最短边缘距离。",
    why_it_matters: "间距过近容易导致手指误触相邻功能，尤其在移动端或车载等动态使用场景。",
    caution: "间距计算基于已标注的触控区域边界；如果相邻控件尚未标注，计算结果可能不完整。"
  },
  touch_overlap: {
    id: "touch_overlap",
    label: "触控区域重叠",
    english_label: "Touch Area Overlap",
    plain_definition: "两个交互对象的触控触发区域在空间上存在相交部分。",
    why_it_matters: "重叠区域会导致用户单次点击时无法确定触发哪一个控件，造成严重操作歧义。",
    caution: "当发生重叠时，工具会标记需关注并计算重叠面积，建议调整触控边界或元素间距。"
  },

  // --- Interaction ---
  interaction_type: {
    id: "interaction_type",
    label: "交互方式",
    english_label: "Interaction Type",
    plain_definition: "用户与该元素发生交互的主要动作类型（如不可交互、单击、滑动或组合）。",
    why_it_matters: "不同交互方式适用不同的尺寸、手势起始区与平台规范要求。",
    caution: "不可交互的纯视觉元素不执行触控尺寸检查，避免产生无意义的合规误报。"
  },
  tap: {
    id: "tap",
    label: "单击",
    english_label: "Tap",
    plain_definition: "手指或指针在目标区域内的单次轻触/点击操作。",
    why_it_matters: "最常见的移动端与触屏交互，对目标最小尺寸与间距有严格要求。",
    caution: "确保触控区域足够容纳指尖接触面，同时与周围可点击元素保持安全间距。"
  },
  swipe: {
    id: "swipe",
    label: "滑动",
    english_label: "Swipe",
    plain_definition: "手指在目标区域内接触后沿特定方向移动并释放的手势操作。",
    why_it_matters: "滑动操作需要清晰的手势起始区域以及无阻碍的滑动通道。",
    caution: "本阶段主要评估滑动起始区域的尺寸与边界距离，暂不包含复杂手势轨迹与速度动力学。"
  },
  tap_swipe: {
    id: "tap_swipe",
    label: "单击 + 滑动",
    english_label: "Tap & Swipe",
    plain_definition: "同时支持轻触激活与手势滑动的复合交互对象（如列表行、卡片轮播）。",
    why_it_matters: "复合控件既需要满足点击尺寸，也需要避免滑动起始区与周边手势冲突。",
    caution: "需特别注意系统边缘手势冲突与内部滑动方向一致性。"
  },
  swipe_direction: {
    id: "swipe_direction",
    label: "滑动方向",
    english_label: "Swipe Direction",
    plain_definition: "滑动手势预期的主运动轴向（横向、纵向或双向）。",
    why_it_matters: "帮助分析手势是否容易与页面滚动或系统返回手势发生方向冲突。",
    caution: "横向滑动在屏幕左右边缘可能受到系统导航手势的拦截或干扰。"
  },

  // --- Calibration & Mapping ---
  design_size_basis: {
    id: "design_size_basis",
    label: "设计尺寸基准",
    english_label: "Design Size Basis",
    plain_definition: "用于把截图的图片像素（px）换算为设计稿中的逻辑单位（pt、dp 或 CSS px）的基准比例。",
    why_it_matters: "平台规范与无障碍标准通常以逻辑单位（如 44pt、48dp、24 CSS px）定义，需要基准换算后方可核验。",
    caution: "设计尺寸基准与物理屏幕换算（毫米）相互独立。即使未配置屏幕毫米映射，已建立的设计基准仍可完整用于平台尺寸与字号核验。"
  },
  css_px: {
    id: "css_px",
    label: "CSS px",
    english_label: "CSS Pixel",
    plain_definition: "Web 标准中的设备独立像素单位，WCAG 2.2 规范以此作为基准度量单位。",
    why_it_matters: "WCAG 2.2 SC 2.5.8 规定目标尺寸基准为 24 × 24 CSS px。",
    caution: "高分屏截图像素通常是 CSS px 的 2 倍或 3 倍，需通过设计尺寸基准进行正确换算。"
  },
  dp: {
    id: "dp",
    label: "dp",
    english_label: "Density-independent Pixel",
    plain_definition: "Android 平台上的密度无关像素单位，在 160 dpi 屏幕上 1 dp 等于 1 物理像素。",
    why_it_matters: "Google Android 官方无障碍指南推荐触控目标不低于 48 × 48 dp。",
    caution: "不同 Android 设备的屏幕密度缩放不同（xhdpi, xxhdpi 等），请按设计稿基准换算。"
  },
  sp: {
    id: "sp",
    label: "sp",
    english_label: "Scale-independent Pixel",
    plain_definition: "Android 平台上的字体大小度量单位，会随用户的系统字体缩放偏好动态缩放。",
    why_it_matters: "Android Accessibility 指南建议正文文本不低于 12 sp。",
    caution: "静态截图无法直接读取用户设备的运行时字体缩放设置，工具按标称设计比例提供近似参考。"
  },
  pt: {
    id: "pt",
    label: "pt",
    english_label: "Point (iOS / iPadOS)",
    plain_definition: "Apple 平台上的标准逻辑点单位（Point），在 1x 屏幕上 1 pt 等于 1 像素。",
    why_it_matters: "Apple HIG 推荐默认触控控件尺寸为 44 × 44 pt，默认正文字号为 17 pt，最小自定义字号为 11 pt。",
    caution: "Retina 屏幕通常为 @2x 或 @3x，对应每 1 pt 包含 2 或 3 个图片像素。"
  },
  exact_measurement: {
    id: "exact_measurement",
    label: "精确测量",
    english_label: "Exact Measurement",
    plain_definition: "在屏幕分辨率和物理尺寸完全已知且截图为完整屏幕时计算出的物理毫米与像素结果。",
    why_it_matters: "具有确定性的高可信度，可作为人因工程与物理人体测量的强事实支撑。",
    caution: "若更换测试设备或截图被缩放，需重新校准屏幕参数。"
  },
  estimated_measurement: {
    id: "estimated_measurement",
    label: "估算测量",
    english_label: "Estimated Measurement",
    plain_definition: "在局部截图或屏幕尺寸不完全匹配时，基于原始像素密度假设推算出的近似毫米数值。",
    why_it_matters: "为局部设计稿切图提供有价值的物理尺寸参考，避免直接失去物理度量。",
    caution: "估算结果存在比例误差可能，不用于强合规性断言。"
  },
  relative_only: {
    id: "relative_only",
    label: "仅相对尺寸",
    english_label: "Relative Only",
    plain_definition: "当前仍可使用图片像素以及已建立的 pt / dp / CSS px 设计尺寸基准进行评估，但暂时无法可靠换算为毫米。",
    why_it_matters: "保持数据严谨性，不生成未经校准的虚假物理毫米数值。查看当前物理尺寸换算状态可了解具体原因。",
    caution: "未建立物理映射不影响已配置的设计稿逻辑尺寸检查与色彩对比度分析。"
  },
  user_specified_mapping: {
    id: "user_specified_mapping",
    label: "用户指定映射",
    english_label: "User Specified Mapping",
    plain_definition: "由设计师明确输入的截图宽度与设计稿逻辑宽度换算关系。",
    why_it_matters: "直接且透明地建立换算，避免工具根据分辨率不可靠地猜测 DPR。",
    caution: "请确保输入的参考宽度与实际设计稿画板宽度一致。"
  },

  // --- Typography & Text Specifications ---
  text_visual_height: {
    id: "text_visual_height",
    label: "文字可视高度",
    english_label: "Text Visual Height",
    plain_definition: "当前框选文字在截图中的可视高度。它可能包含行高、字形上下留白或多行内容，因此不等同于真实字号。",
    why_it_matters: "作为单行文本初筛估算的尺寸输入代理，同时帮助设计师观察文字在容器内的占位高度。",
    caution: "可视高度受字体度量（Ascender/Descender）、行高设置及框选贴合度影响，仅作为近似参考。"
  },
  font_size: {
    id: "font_size",
    label: "字号",
    english_label: "Font Size",
    plain_definition: "文字在设计系统中的字号，例如 pt、sp 或 CSS px。竞品截图无法直接读取源设计字号时，本工具可基于单行可视高度提供近似估算。",
    why_it_matters: "直接影响文本可读性以及 WCAG SC 1.4.3 对比度大字号阈值判定。",
    caution: "如果已知设计源文件字号，可直接输入并标记为用户确认，获得更具确定性的合规检查结论。"
  },
  estimated_font_size: {
    id: "estimated_font_size",
    label: "截图估算字号",
    english_label: "Estimated Font Size",
    plain_definition: "根据截图框选范围和设计尺寸基准推算的近似字号，不等同于源设计文件中的真实字号。",
    why_it_matters: "免去竞品分析或快速评审中逐一手填字号的繁琐负担，快速提供首轮参考。",
    caution: "截图估算字号基于当前单行文字框选的可视高度近似计算，可能受到字体字形、行高、截图缩放和框选范围影响，不等同于设计源文件中的真实字号。"
  },
  text_layout: {
    id: "text_layout",
    label: "文字布局",
    english_label: "Text Layout",
    plain_definition: "标注文字是单行排版还是多行段落。",
    why_it_matters: "单行文字的可视高度可作为字号估算的近似代理；多行文字的总框高包含行距与多行累加，不能直接算作字号。",
    caution: "多行文字建议单独框选单行进行估算，或直接输入已知字号。"
  },
  text_role: {
    id: "text_role",
    label: "文字角色",
    english_label: "Text Role",
    plain_definition: "文字在界面中的信息层级与功能定位（正文、标签/辅助说明、标题或其他）。",
    why_it_matters: "部分平台（如 Android）对正文有 12sp 专属无障碍建议，而标题或说明文字适用不同的规则要求。",
    caution: "不同角色的可读性期望不同，例如正文需重点关注长时间阅读舒适度。"
  },
  text_weight: {
    id: "text_weight",
    label: "字重类别",
    english_label: "Font Weight Category",
    plain_definition: "文字字体的粗细分类（常规 Regular vs. 粗体 Bold）。",
    why_it_matters: "WCAG 2.2 SC 1.4.3 规定：粗体在 14pt (约 18.5 CSS px) 即视为大字号（适用 3:1 阈值），而常规字体需达到 18pt (24 CSS px)。",
    caution: "正确选择字重有助于自动判定适用的是 4.5:1 还是 3:1 对比度阈值。"
  },
  text_size_source: {
    id: "text_size_source",
    label: "字号来源",
    english_label: "Text Size Source",
    plain_definition: "字号数值的获取途径（截图估算 vs. 用户确认）。",
    why_it_matters: "严格区分近似推算与已知事实，保证评估报告的科学诚实与可追溯性。",
    caution: "手动修改字号数值后会自动转为「用户确认」，可随时点击恢复截图估算。"
  },
  text_size_guidance: {
    id: "text_size_guidance",
    label: "平台字号参考",
    english_label: "Platform Text Size Guidance",
    plain_definition: "操作系统官方设计指南中的推荐与最小文字尺寸（如 Apple HIG 17pt 默认 / 11pt 最小，Android 正文 12sp）。",
    why_it_matters: "辅助设计师核对排版是否符合平台标准与主流无障碍建议。",
    caution: "平台指南属于推荐性人机交互实践（L2 规则），非通用法律强制项。"
  },

  // --- Evaluation ---
  text_contrast: {
    id: "text_contrast",
    label: "文本颜色对比度",
    english_label: "Text Contrast",
    plain_definition: "文字前景色与背景色之间的相对亮度比值（如 4.5:1）。",
    why_it_matters: "WCAG 2.2 SC 1.4.3 核心要求，确保低视力用户与不同光照环境下文字清晰可读。",
    caution: "大号文字（>=18pt 或 >=14pt 粗体）阈值为 3:1，正文常规文字阈值为 4.5:1。",
    reference_id: "L1-WCAG-SC-1.4.3",
    reference_label: "WCAG 2.2 SC 1.4.3"
  },
  non_text_contrast: {
    id: "non_text_contrast",
    label: "非文字组件对比度",
    english_label: "Non-text Contrast",
    plain_definition: "界面组件（按钮边框、输入框焦点、功能图标）与相邻背景之间的相对亮度比值。",
    why_it_matters: "WCAG 2.2 SC 1.4.11 核心要求，确保用户能明确识别控件边界与交互状态。",
    caution: "阈值为 3.0:1；纯装饰性图标或非活动禁用状态享有规范豁免。",
    reference_id: "L1-WCAG-SC-1.4.11",
    reference_label: "WCAG 2.2 SC 1.4.11"
  },
  touch_reasonableness: {
    id: "touch_reasonableness",
    label: "触控合理性",
    english_label: "Touch Reasonableness",
    plain_definition: "综合触控尺寸、相邻重叠、间距与平台建议得出的定性状态（良好 / 需关注 / 待补充）。",
    why_it_matters: "帮助设计师快速获得直观的交互可用性反馈，而不依赖虚假的量化数字评分。",
    caution: "该状态为定性检查集合，不代表全面的无障碍合规性认证。"
  },
  platform_reference_area: {
    id: "platform_reference_area",
    label: "平台参考触控区域",
    english_label: "Platform Reference Touch Area",
    plain_definition: "根据当前所选操作系统规范建议的最小或默认交互区域（如 iOS 44pt，Android 48dp）。",
    why_it_matters: "设计师可一键以此作为基准生成触控边界，无需从零绘制。",
    caution: "参考区域为推荐基准，需设计师确认后方才应用为当前元素的触控边界。"
  },

  // --- Evidence & Standards ---
  wcag: {
    id: "wcag",
    label: "WCAG 规范",
    english_label: "Web Content Accessibility Guidelines",
    plain_definition: "W3C 制定的国际通用数字无障碍指南标准体系。",
    why_it_matters: "全球许多地区法律法规（如 Section 508, EN 301 549）的基础引用依据。",
    caution: "本工具提供针对特定成功准则的尺寸、位置与色彩核验，而非全站合规证书。"
  },
  sc_1_4_3: {
    id: "sc_1_4_3",
    label: "WCAG SC 1.4.3 对比度 (最小)",
    english_label: "Contrast (Minimum)",
    plain_definition: "文本视觉呈现要求满足至少 4.5:1（大号文字 3:1）的对比度。",
    why_it_matters: "Level AA 强制要求，保障所有文本内容的普遍可读性。",
    caution: "仅适用于实际承载文本信息的元素。",
    reference_id: "L1-WCAG-SC-1.4.3",
    reference_label: "WCAG 2.2 SC 1.4.3"
  },
  sc_1_4_11: {
    id: "sc_1_4_11",
    label: "WCAG SC 1.4.11 非文字对比度",
    english_label: "Non-text Contrast",
    plain_definition: "用户界面组件边界、状态与图形对象必须满足至少 3:1 的对比度。",
    why_it_matters: "Level AA 强制要求，防止用户因视觉弱化而找不到按钮或输入框。",
    caution: "处于不可用状态或由浏览器默认渲染的控件可免除此要求。",
    reference_id: "L1-WCAG-SC-1.4.11",
    reference_label: "WCAG 2.2 SC 1.4.11"
  },
  sc_2_5_8: {
    id: "sc_2_5_8",
    label: "WCAG SC 2.5.8 目标尺寸 (最小)",
    english_label: "Target Size (Minimum)",
    plain_definition: "指针目标的尺寸至少达到 24 × 24 CSS px，或满足充分的间距例外条件。",
    why_it_matters: "WCAG 2.2 Level AA 新增准则，防止移动端与触屏端指针误触。",
    caution: "低于 24 CSS px 时需结合间距圆（24px 直径）、内联文本或基本呈现等例外综合判定，不能简单断言违规。",
    reference_id: "L1-WCAG-SC-2.5.8",
    reference_label: "WCAG 2.2 SC 2.5.8"
  },
  platform_guideline: {
    id: "platform_guideline",
    label: "平台设计指南",
    english_label: "Platform Guideline",
    plain_definition: "官方操作系统厂商发布的界面设计规范与人机交互指南（如 Apple HIG、Material Design）。",
    why_it_matters: "保证产品符合平台用户习惯与原生系统的高品质交互体验。",
    caution: "平台指南属于推荐性实践（L2 规则），与强制性法律标准（L1 规则）有所区别。"
  },
  verified_reference: {
    id: "verified_reference",
    label: "已核验依据",
    english_label: "Verified Reference",
    plain_definition: "经由官方标准文本或权威设计指南核验并记录在仓库策略中的规则依据。",
    why_it_matters: "确保评估结论具备严谨的条文溯源，不捏造虚假的标准断言。",
    caution: "依据结论严格限制在其声明的适用范围内。"
  },
  simulated_result: {
    id: "simulated_result",
    label: "模拟演示结果",
    english_label: "Simulated Preview",
    plain_definition: "由工具预置模型生成的示范性评估数据（如整体认知负荷、多人群差异）。",
    why_it_matters: "用于展示多层评估框架与完整报告形态。",
    caution: "模拟结果并非来自当前真实图片的真实 AI 计算，不可作为正式评估报告。"
  }
};

export function getDefinition(id: string): ContextualDefinition | undefined {
  return definitionRegistry[id];
}
