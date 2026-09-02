export type IssueType = 'touch_target' | 'spacing' | 'contrast' | 'readability' | 'information_hierarchy' | 'cognitive_load' | 'recognition' | 'custom_rule';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type EvidenceLevel = 'standard' | 'platform_guideline' | 'theory' | 'heuristic' | 'custom';
export type RuleLayer = 'L1_HARD_CONSTRAINT' | 'L2_PLATFORM_GUIDELINE' | 'L3_HUMAN_FACTORS' | 'L4_DOMAIN_RULE' | 'L5_CUSTOM_RULE';
export type ReasoningType = 'rule_match' | 'theory_inference' | 'heuristic_risk' | 'custom_rule';
export type AnnotationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'FIXED' | 'VERIFIED' | 'CLOSED';
export type ConflictStatus = 'none' | 'potential_conflict' | 'overridden' | 'blocked_by_higher_priority_rule';
export type ReferenceStatus = 'verified_reference' | 'example_reference' | 'pending_verification';
export type ClaimStrength = 'strong' | 'moderate' | 'weak';
export type ContextType = 'user_group' | 'usage_context' | 'rule_set' | 'device_profile';
export type Suitability = 'suitable' | 'acceptable' | 'risk' | 'not_suitable' | 'unknown';
export type SeverityAdjustment = 'none' | 'increase' | 'decrease';

export interface Evidence {
  evidence_id: string;
  source_name: string;
  source_type: string;
  rule_id: string;
  guideline_ref: string;
  summary: string;
  evidence_level: EvidenceLevel;
  reasoning_type: ReasoningType;
  reference_status: ReferenceStatus;
  claim_strength: ClaimStrength;
  priority: number;
  url?: string;
  note?: string;
}

export interface Measurement {
  metric_name: string;
  current_value: string | number;
  threshold_value: string | number;
  recommended_value?: string | number;
  unit?: string;
  delta?: string | number;
  interpretation: string;
}

export interface AppliedContext {
  device_type?: string;
  resolution?: string;
  viewing_distance?: string;
  usage_context?: string;
  target_user_groups?: string[];
  rule_sets?: string[];
  evaluation_dimensions?: string[];
  impact_summary: string;
}

export interface ContextualFinding {
  finding_id: string;
  context_type: ContextType;
  context_label: string;
  suitability: Suitability;
  severity_adjustment?: SeverityAdjustment;
  reason: string;
  evidence_refs?: string[];
  recommendation?: string;
}

export interface Annotation {
  annotation_id: string;
  /** Normalized image coordinate from 0 to 1, not page or screen pixels. */
  x: number;
  /** Normalized image coordinate from 0 to 1, not page or screen pixels. */
  y: number;
  /** Normalized image width ratio from 0 to 1. */
  width: number;
  /** Normalized image height ratio from 0 to 1. */
  height: number;
  issue_type: IssueType;
  severity: Severity;
  description: string;
  recommendation: string;
  rule_id: string;
  rule_layer: RuleLayer;
  reasoning_type: ReasoningType;
  evidence: Evidence[];
  evidence_level: EvidenceLevel;
  measurement: Measurement;
  source_priority: number;
  confidence: number;
  target_user_group: string[];
  applied_context: AppliedContext;
  contextual_findings: ContextualFinding[];
  status: AnnotationStatus;
  conflict_status: ConflictStatus;
  custom_rule_source?: string;
}

export interface AnalysisInput {
  deviceProfile: string;
  deviceType: string;
  displaySize: string;
  resolution: string;
  distance: string;
  userGroups: string[];
  scenario: string;
  scenarioDomain?: "mobile" | "desktop" | "automotive" | "unknown";
  scenarioDomainUserOverridden?: boolean;
  ruleSets: string[];
  dimensions: string[];
}

export interface AnalysisResult {
  annotations: Annotation[];
}
