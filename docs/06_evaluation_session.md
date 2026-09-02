# 06 评估会话（Evaluation Session）

## 目的
将“一次评测”定义为一个可复盘、可回溯的 `session`，用于后续对比、验收与案例沉淀。

## Session Schema

```ts
export interface EvaluationSession {
  session_id: string;
  input: {
    image: string;
    device: string;
    distance: string;
    user_group: string[];
  };
  rule_set_version: string;
  annotations: Annotation[];
  summary: string;
  created_at: string;
}
```

## 字段说明
- `session_id`: 会话唯一标识
- `input`: 本次评估输入快照（图像、设备、距离、用户组）
- `rule_set_version`: 本次使用的规则集版本
- `annotations`: 本次评估输出标注
- `summary`: 会话摘要，便于列表浏览与复盘
- `created_at`: 评估生成时间（ISO 字符串）

## MVP 实现约束
- 仅本地 state / mock 存储
- 不接数据库
- 保持结构可直接迁移到服务端 API
