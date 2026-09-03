/**
 * Core Human Factors Domain Types.
 * Pure TypeScript definitions with zero dependencies on React, DOM, or UI.
 * Reusable Human Factors domain types designed for consumer-independent integration across evaluation contexts.
 */

/**
 * Source attribution for viewing distance evidence.
 */
export type ViewingDistanceSource =
  | "user_confirmed"
  | "scenario_assumed"
  | "device_profile"
  | "spatially_derived"
  | "source_confirmed";

/**
 * Reusable evidence object for viewing distance.
 * Normalized unit: millimeters (mm).
 */
export interface ViewingDistanceEvidence {
  distance_mm: number;
  source: ViewingDistanceSource;
  provenance?: string;
  assumptions?: string[];
}

/**
 * Reusable representation of physical visual measurements.
 * Normalized unit: millimeters (mm).
 */
export interface PhysicalVisualMeasurement {
  width_mm?: number;
  height_mm?: number;
  provenance?: string;
  assumptions?: string[];
}

/**
 * Reusable visual angle measurement result.
 * Computed using the exact trigonometric angular size formula:
 * theta = 2 * atan(size / (2 * distance))
 *
 * Visual angle in this phase is measurement_only. It contains NO compliance verdict.
 */
export interface VisualAngleMeasurement {
  // Angular size in degrees
  horizontal_deg?: number;
  vertical_deg?: number;

  // Angular size in arcminutes (1 deg = 60 arcmin)
  horizontal_arcmin?: number;
  vertical_arcmin?: number;

  // Normalized input references
  viewing_distance_mm: number;
  physical_width_mm?: number;
  physical_height_mm?: number;

  // Preserved upstream provenance & assumptions
  provenance?: string;
  assumptions?: string[];
}

/**
 * Reusable rule-transferability classification across device contexts or spatial distances.
 * Separate dimension from RuleLayer (L1-L5) and ReasoningType.
 */
export type RuleTransferability =
  | "direct_only"
  | "visual_angle_equivalent"
  | "non_transferable"
  | "unknown";

/**
 * Human Factors mechanism categories protecting human interaction and perception.
 */
export type HumanFactorsMechanism =
  | "visual_legibility"
  | "visual_recognition"
  | "visual_discrimination"
  | "motor_target_acquisition"
  | "motor_error_prevention"
  | "layout_density"
  | "platform_convention"
  | "accessibility_requirement"
  | "unknown";

/**
 * Audit status for rule transferability review.
 */
export type RuleTransferabilityAuditStatus =
  | "direct_only"
  | "non_transferable"
  | "candidate_for_visual_angle_review"
  | "insufficient_evidence"
  | "unknown";

/**
 * Structural record for Rule Transferability Evidence Audit.
 */
export interface RuleTransferabilityAuditRecord {
  rule_id: string;
  rule_layer: string;
  rule_title: string;
  mechanism: HumanFactorsMechanism;
  native_unit: string;
  direct_applicability: string;
  physical_interpretability: "direct" | "via_hardware_calibration" | "uninterpretable" | "unknown";
  reference_viewing_distance: "missing" | "documented" | "inferred";
  audit_status: RuleTransferabilityAuditStatus;
  evidence_strength: "verified" | "moderate" | "weak" | "pending_verification";
  confounding_variables: string[];
  transferability_assessment: string;
}

/**
 * Applicability origin describing the relationship between the reference source and the current context.
 * Independent from RuleLayer and ReasoningType.
 */
export type ApplicabilityOrigin =
  | "direct_domain"
  | "direct_human_factors"
  | "context_adapted"
  | "external_reference"
  | "descriptive_measurement";

/**
 * Role of a reference within the multi-reference evaluation envelope.
 * Inferred from source semantics and scenario applicability analysis, not solely from numeric value.
 */
export type ReferenceRole =
  | "governing_minimum"
  | "recommended_minimum"
  | "optimal_reference"
  | "secondary_reference"
  | "adapted_reference"
  | "conservative_reference"
  | "descriptive_only";

/**
 * Scenario consequence and criticality classification.
 */
export type ScenarioCriticality =
  | "safety_critical"
  | "task_critical"
  | "normal_interaction"
  | "non_critical"
  | "unknown";

/**
 * Concrete physical/visual feature being measured.
 * Gate for matching human factors references to measurement realities.
 */
export type MeasurementTarget =
  | "element_visual_bounds"
  | "character_cap_height"
  | "character_x_height"
  | "character_height"
  | "primary_graphical_element"
  | "touch_bounds"
  | "unknown";

import type { ScenarioDomain } from "../types/context";

/**
 * Lightweight scenario context scope.
 */
export interface ScenarioScope {
  domain?: ScenarioDomain;
  observer_role?: "driver" | "front_passenger" | "rear_passenger" | "unspecified";
  operation_state?: "driving" | "stationary" | "parked" | "unspecified";
  criticality?: ScenarioCriticality;
  time_criticality?: "time_critical" | "non_time_critical" | "unspecified";
}

/**
 * Candidate Human Factors Reference in the qualification repository.
 */
export interface CandidateHumanFactorsReference {
  reference_id: string;
  source: string;
  title: string;
  mechanism: HumanFactorsMechanism;
  measurement_target: MeasurementTarget;
  value: number | string;
  unit: string;
  target_domain?: string;
  applicable_scopes?: {
    observer_roles?: ("driver" | "front_passenger" | "rear_passenger" | "unspecified")[];
    operation_states?: ("driving" | "stationary" | "parked" | "unspecified")[];
    criticalities?: ScenarioCriticality[];
    time_criticalities?: ("time_critical" | "non_time_critical" | "unspecified")[];
  };
  default_role: ReferenceRole;
  rule_transferability?: RuleTransferability;
  evidence_strength: "verified" | "moderate" | "weak" | "pending_verification";
  applicability_origin: ApplicabilityOrigin;
  provenance?: string;
  limitations?: string[];
}

/**
 * Evaluated Reference within a resolved envelope.
 */
export interface EvaluatedReference {
  reference: CandidateHumanFactorsReference;
  assigned_role: ReferenceRole;
  is_applicable: boolean;
  applicability_reason: string;
  measurement_matched: boolean;
}

/**
 * Reference Envelope representing multiple qualified references around one measurable Human Factors dimension.
 * Preserves evidence plurality without computing synthetic numeric averages.
 */
export interface ReferenceEnvelope {
  metric: string;
  current_measurement?: {
    value?: number;
    unit: string;
    target: MeasurementTarget;
  };
  governing_references: EvaluatedReference[];
  recommended_references: EvaluatedReference[];
  optimal_references: EvaluatedReference[];
  secondary_references: EvaluatedReference[];
  adapted_references: EvaluatedReference[];
  conservative_references: EvaluatedReference[];
  descriptive_references: EvaluatedReference[];
  unmatched_references: EvaluatedReference[];
}
