# 04 技术架构

## 前端技术栈
- React
- TypeScript
- Vite

## 分层设计（MVP）
1. **UI 层**
   - 参数输入
   - 图片展示
   - 标注绘制
   - 问题列表
2. **Domain 层**
   - 评估维度定义
   - 标注模型定义
3. **Service 层**
   - `analysisService` 接口
   - 当前返回 mock 结果
   - 后续可替换为服务端 API

## 可扩展接口
- `analyzeDesign(input): Promise<AnalysisResult>`
- 后续支持：
  - 图像识别输出
  - 规则库融合
  - 多模态推理链
