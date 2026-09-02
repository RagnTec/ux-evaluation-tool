export type {
  ViewingDistanceSource,
  ViewingDistanceEvidence,
  PhysicalVisualMeasurement,
  VisualAngleMeasurement,
  RuleTransferability,
  HumanFactorsMechanism,
  RuleTransferabilityAuditStatus,
  RuleTransferabilityAuditRecord,
  ApplicabilityOrigin,
  ReferenceRole,
  ScenarioCriticality,
  MeasurementTarget,
  ScenarioScope,
  CandidateHumanFactorsReference,
  EvaluatedReference,
  ReferenceEnvelope
} from "./types";

export {
  validateViewingDistance,
  parseViewingDistanceMm,
  createViewingDistanceEvidence
} from "./viewingDistance";

export {
  calculateExactVisualAngle,
  calculateVisualAngleFromDimensions,
  derivePhysicalSizeForVisualAngle
} from "./visualAngle";

export {
  getRuleTransferability,
  RULE_TRANSFERABILITY_AUDIT_INVENTORY
} from "./ruleTransferability";

export {
  resolveReferenceEnvelope
} from "./referenceResolver";
