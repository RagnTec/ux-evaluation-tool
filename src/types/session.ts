import type { Annotation } from './annotation';

export interface SessionInput {
  image: string;
  device: string;
  distance: string;
  user_group: string[];
}

export interface EvaluationSession {
  session_id: string;
  input: SessionInput;
  rule_set_version: string;
  annotations: Annotation[];
  summary: string;
  created_at: string;
}
