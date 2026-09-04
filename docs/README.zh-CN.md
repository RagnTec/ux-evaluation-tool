# 文档导航目录

[English](./README.md) | **简体中文**

---

## 1. 文档概览

本文档目录为 **UX Evaluation Tool** 的公开文档集提供结构化导航。它旨在帮助使用者快速上手，协助开发者深入理解前端架构与规则引擎设计，并为研究人员查阅人因理论证据与规则迁移性审计提供清晰指引。

---

## 2. 核心产品与架构

- [**00 产品定义与核心原则**](./00_product_definition.zh-CN.md)：产品愿景、问题定义、核心定位与明确的运行边界。
- [**01 MVP 范围与功能边界**](./01_mvp_scope.zh-CN.md)：Public v0.1 功能范围、已支持的评估路径及系统边界。
- [**02 评估体系框架**](./02_evaluation_framework.zh-CN.md)：五层规则体系（L1–L5）、证据驱动的精度分级及规则判定流。
- [**03 标注与证据模型**](./03_annotation_model.zh-CN.md)：人工空间标注、测量证据及其派生评估数据模型。
- [**04 技术架构设计**](./04_technical_architecture.zh-CN.md)：本地优先的纯前端架构、模块拓扑及单向数据流。

---

## 3. 评估与规则体系

- [**06 评估会话生命周期**](./06_evaluation_session.zh-CN.md)：项目与工作区生命周期、本地持久化、状态恢复及派生评估更新。
- [**07 规则引擎设计**](./07_rule_engine_design.zh-CN.md)：确定性规则评估流水线、输入依赖及阈值判定逻辑。
- [**08 解释层与可解释性设计**](./08_explanation_layer_design.zh-CN.md)：认识论推理类型、证据卡片、可读的解释依据与整改建议。
- [**09 规则依据与多源治理**](./09_rule_reference_policy.zh-CN.md)：多依据治理模型、参考包络（Reference Envelope）、优先级裁决与降级策略。

---

## 4. 研究与理论证据

*（注：以下文档属于人机工效学理论调研与证据审计，不代表全部直接进入运行时评估功能。）*

- [**03 产品定位与市场空白**](./research/03_product_positioning.zh-CN.md)：产品定位，以及其在无障碍检查、可用性测试平台与专业人因工具之间的产品空白。
- [**04 规则来源清单与证据分类**](./research/04_rule_source_inventory.zh-CN.md)：规则来源清单、证据状态及运行时 / 调研分类。
- [**人因多依据证据资格认定**](./research/human_factors_evidence_qualification.zh-CN.md)：多来源人因工效学证据资格认定与测量目标门控机制。
- [**规则可迁移性证据审计**](./research/rule_transferability_audit.zh-CN.md)：跨视距与跨交互模态规则迁移性科学审计。

---

## 5. 语言规范

- 以 `.md` 结尾的文件为英文标准文档（English canonical documents）。
- 以 `.zh-CN.md` 结尾的文件为对应的简体中文文档。
- 每对双语文档保持语义一致，并允许根据语言习惯进行自然表达。

---

## 6. 推荐阅读路径

- **产品经理 / UX 设计师阅读路径**：
  [00 产品定义](./00_product_definition.zh-CN.md) → [01 MVP 范围](./01_mvp_scope.zh-CN.md) → [02 评估框架](./02_evaluation_framework.zh-CN.md) → [08 解释层设计](./08_explanation_layer_design.zh-CN.md)
- **开发者 / 开源贡献者阅读路径**：
  [04 技术架构](./04_technical_architecture.zh-CN.md) → [03 标注模型](./03_annotation_model.zh-CN.md) → [06 评估会话](./06_evaluation_session.zh-CN.md) → [07 规则引擎](./07_rule_engine_design.zh-CN.md) → [09 规则依据治理](./09_rule_reference_policy.zh-CN.md)
- **人因工程专家 / 科研人员阅读路径**：
  [02 评估框架](./02_evaluation_framework.zh-CN.md) → [09 规则依据治理](./09_rule_reference_policy.zh-CN.md) → [04 规则来源清单](./research/04_rule_source_inventory.zh-CN.md) → [人因证据资格认定](./research/human_factors_evidence_qualification.zh-CN.md) → [规则可迁移性审计](./research/rule_transferability_audit.zh-CN.md)
