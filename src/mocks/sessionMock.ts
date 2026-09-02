import type { EvaluationSession } from '../types/session';

export const initialSession: EvaluationSession = {
  session_id: 'session-initial',
  input: {
    image: '',
    device: '移动端',
    distance: '35cm',
    user_group: ['东亚', '女性'],
  },
  rule_set_version: 'v0.1-mock',
  annotations: [],
  summary: '尚未执行评估。',
  created_at: new Date().toISOString(),
};
