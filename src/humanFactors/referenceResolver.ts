import type {
  CandidateHumanFactorsReference,
  EvaluatedReference,
  ReferenceEnvelope,
  ScenarioScope,
  MeasurementTarget,
  ReferenceRole
} from "./types";
import { getRuleTransferability } from "./ruleTransferability";

export interface ResolveReferenceEnvelopeParams {
  metric: string;
  current_measurement?: {
    value?: number;
    unit: string;
    target: MeasurementTarget;
  };
  scenario?: ScenarioScope;
  candidates: CandidateHumanFactorsReference[];
}

/**
 * Pure policy resolver for multi-reference Human Factors envelopes.
 * Evaluates candidate references against scenario scope and measurement target semantics.
 * Categorizes references into governing, recommended, optimal, secondary, adapted, conservative, or descriptive.
 *
 * Governing Reference Precedence & Scope Rules:
 * 1. Measurement Target Compatibility:
 *    If a reference requires `character_height` but the current measurement is `element_visual_bounds`,
 *    `measurement_matched` is false and it cannot become a governing reference.
 * 2. Scope Matching:
 *    A direct domain reference (e.g. automotive driver + driving) matches when scenario conditions match.
 *    If scenario is out-of-scope (e.g. rear_passenger or parked), a driver-moving minimum is demoted
 *    to `conservative_reference` or `secondary_reference` rather than governing.
 * 3. Secondary Reference Boundary:
 *    Secondary or adapted references coexist for design guidance but NEVER override governing failures.
 */
export function resolveReferenceEnvelope(
  params: ResolveReferenceEnvelopeParams
): ReferenceEnvelope {
  const { metric, current_measurement, scenario, candidates } = params;

  const evaluated: EvaluatedReference[] = candidates.map((candidate) => {
    // 1. Measurement Target Check
    const measurementMatched =
      !current_measurement ||
      candidate.measurement_target === "unknown" ||
      current_measurement.target === "unknown" ||
      candidate.measurement_target === current_measurement.target;

    // 2. Scenario Scope Evaluation
    let scopeApplicable = true;
    const reasons: string[] = [];

    if (candidate.applicable_scopes && scenario) {
      const scopes = candidate.applicable_scopes;

      if (
        scopes.observer_roles &&
        scenario.observer_role &&
        scenario.observer_role !== "unspecified" &&
        !scopes.observer_roles.includes(scenario.observer_role)
      ) {
        scopeApplicable = false;
        reasons.push(
          `观察者角色不匹配 (适用: ${scopes.observer_roles.join(", ")}, 当前: ${scenario.observer_role})`
        );
      }

      if (
        scopes.operation_states &&
        scenario.operation_state &&
        scenario.operation_state !== "unspecified" &&
        !scopes.operation_states.includes(scenario.operation_state)
      ) {
        scopeApplicable = false;
        reasons.push(
          `运行状态不匹配 (适用: ${scopes.operation_states.join(", ")}, 当前: ${scenario.operation_state})`
        );
      }

      if (
        scopes.criticalities &&
        scenario.criticality &&
        scenario.criticality !== "unknown" &&
        !scopes.criticalities.includes(scenario.criticality)
      ) {
        scopeApplicable = false;
        reasons.push(
          `任务关键度不匹配 (适用: ${scopes.criticalities.join(", ")}, 当前: ${scenario.criticality})`
        );
      }

      if (
        scopes.time_criticalities &&
        scenario.time_criticality &&
        scenario.time_criticality !== "unspecified" &&
        !scopes.time_criticalities.includes(scenario.time_criticality)
      ) {
        scopeApplicable = false;
        reasons.push(
          `时间敏感度不匹配 (适用: ${scopes.time_criticalities.join(", ")}, 当前: ${scenario.time_criticality})`
        );
      }
    }

    // 3. Domain Check
    if (
      candidate.target_domain &&
      candidate.target_domain !== scenario?.domain
    ) {
      scopeApplicable = false;
      reasons.push(
        `领域不匹配 (适用: ${candidate.target_domain}, 当前: ${scenario?.domain || "未指定"})`
      );
    }

    // 4. Role Assignment
    let assignedRole: ReferenceRole = candidate.default_role;
    let isAdapted = false;

    if (!measurementMatched) {
      assignedRole = "descriptive_only";
      reasons.push(
        `测量目标类型不匹配 (参考要求: ${candidate.measurement_target}, 当前提供: ${current_measurement?.target || "none"})`
      );
    } else if (!scopeApplicable) {
      const transferability = candidate.rule_transferability || getRuleTransferability(candidate.reference_id);
      const isVisualMechanism =
        candidate.measurement_target === "character_height" ||
        candidate.measurement_target === "character_cap_height" ||
        candidate.measurement_target === "character_x_height" ||
        candidate.measurement_target === "primary_graphical_element";

      if (
        transferability === "visual_angle_equivalent" &&
        isVisualMechanism &&
        candidate.evidence_strength !== "weak" &&
        candidate.evidence_strength !== "pending_verification"
      ) {
        assignedRole = "adapted_reference";
        isAdapted = true;
        reasons.push("跨场景等视角换算参考 (visual_angle_equivalent)");
      } else if (candidate.default_role === "governing_minimum") {
        assignedRole = "conservative_reference";
        reasons.push("非当前场景直接管辖范围，降级为保守参考");
      } else if (
        candidate.default_role === "recommended_minimum" ||
        candidate.default_role === "optimal_reference" ||
        candidate.default_role === "secondary_reference"
      ) {
        assignedRole = "secondary_reference";
        reasons.push("超出直接场景范围，降级为次级设计参考");
      } else {
        assignedRole = "descriptive_only";
        reasons.push("超出直接场景范围，降级为描述性参考");
      }
    }

    const isApplicable = (measurementMatched && scopeApplicable) || isAdapted;
    const applicabilityReason =
      reasons.length > 0
        ? reasons.join("; ")
        : "完全符合当前测量目标与场景范围";

    return {
      reference: candidate,
      assigned_role: assignedRole,
      is_applicable: isApplicable,
      applicability_reason: applicabilityReason,
      measurement_matched: measurementMatched
    };
  });

  const envelope: ReferenceEnvelope = {
    metric,
    current_measurement,
    governing_references: [],
    recommended_references: [],
    optimal_references: [],
    secondary_references: [],
    adapted_references: [],
    conservative_references: [],
    descriptive_references: [],
    unmatched_references: []
  };

  for (const item of evaluated) {
    if (!item.measurement_matched) {
      envelope.unmatched_references.push(item);
      continue;
    }

    switch (item.assigned_role) {
      case "governing_minimum":
        envelope.governing_references.push(item);
        break;
      case "recommended_minimum":
        envelope.recommended_references.push(item);
        break;
      case "optimal_reference":
        envelope.optimal_references.push(item);
        break;
      case "secondary_reference":
        envelope.secondary_references.push(item);
        break;
      case "adapted_reference":
        envelope.adapted_references.push(item);
        break;
      case "conservative_reference":
        envelope.conservative_references.push(item);
        break;
      case "descriptive_only":
      default:
        envelope.descriptive_references.push(item);
        break;
    }
  }

  return envelope;
}
