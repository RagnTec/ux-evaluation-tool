import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  calculateExactVisualAngle,
  calculateVisualAngleFromDimensions,
  resolveReferenceEnvelope
} from "../../src/humanFactors";
import type {
  PhysicalVisualMeasurement,
  ViewingDistanceEvidence,
  CandidateHumanFactorsReference,
  ScenarioScope
} from "../../src/humanFactors";

describe("Human Factors Core: Contract 0.1 Isolation & Reusable Fixtures", () => {
  describe("Shared Core Dependency Isolation", () => {
    it("ensures all modules under src/humanFactors/ contain ZERO UI/React/DOM imports", () => {
      const hfDir = path.resolve(__dirname, "../../src/humanFactors");
      const files = fs.readdirSync(hfDir).filter((f) => f.endsWith(".ts"));

      expect(files.length).toBeGreaterThan(0);

      const forbiddenPatterns = [
        /from\s+['"]react['"]/,
        /from\s+['"]react-dom['"]/,
        /from\s+['"].*components.*['"]/,
        /from\s+['"].*types\/designElement.*['"]/,
        /from\s+['"].*utils\/report.*['"]/,
        /from\s+['"].*services\/workspaceStorage.*['"]/
      ];

      for (const file of files) {
        const content = fs.readFileSync(path.join(hfDir, file), "utf-8");
        for (const pattern of forbiddenPatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });
  });

  describe("Cross-Project Reusable Calculation Fixtures", () => {
    const calculationFixtures = [
      {
        sizeMm: 10,
        distMm: 500,
        expectedDeg: 1.1458,
        expectedArcmin: 68.75
      },
      {
        sizeMm: 7,
        distMm: 700,
        expectedDeg: 0.5730,
        expectedArcmin: 34.38
      },
      {
        sizeMm: 4.8,
        distMm: 700,
        expectedDeg: 0.3929,
        expectedArcmin: 23.57
      }
    ];

    calculationFixtures.forEach(({ sizeMm, distMm, expectedDeg, expectedArcmin }) => {
      it(`calculates exact visual angle for size=${sizeMm}mm at distance=${distMm}mm`, () => {
        const result = calculateExactVisualAngle(sizeMm, distMm);
        expect(result).not.toBeNull();
        expect(result!.deg).toBeCloseTo(expectedDeg, 3);
        expect(result!.arcmin).toBeCloseTo(expectedArcmin, 1);
      });
    });
  });

  describe("Weakest-Evidence Provenance Preservation", () => {
    it("preserves upstream estimated provenance and assumptions through visual angle calculation", () => {
      const physEvidence: PhysicalVisualMeasurement = {
        width_mm: 10,
        height_mm: 5,
        provenance: "等比贴合估算",
        assumptions: ["物理尺寸基于屏幕等比贴合估算"]
      };

      const distEvidence: ViewingDistanceEvidence = {
        distance_mm: 700,
        source: "spatially_derived",
        provenance: "3D空间光线投射外部测量",
        assumptions: ["眼椭圆基准视距"]
      };

      const result = calculateVisualAngleFromDimensions(physEvidence, distEvidence);
      expect(result).not.toBeNull();

      // Combined provenance maintains both facts
      expect(result!.provenance).toContain("等比贴合估算");
      expect(result!.provenance).toContain("3D空间光线投射外部测量");

      // Combined assumptions retain all upstream qualifiers
      expect(result!.assumptions).toContain("物理尺寸基于屏幕等比贴合估算");
      expect(result!.assumptions).toContain("眼椭圆基准视距");
    });
  });

  describe("Domain-Neutral Reference Envelope Resolution", () => {
    it("resolves pure domain candidates into distinct envelope roles", () => {
      const testCandidate: CandidateHumanFactorsReference = {
        reference_id: "REF-TEST-GENERIC",
        source: "HF Handbook",
        title: "通用人因字高推荐",
        mechanism: "visual_legibility",
        measurement_target: "character_height",
        value: 16,
        unit: "arcmin",
        default_role: "recommended_minimum",
        evidence_strength: "verified",
        applicability_origin: "direct_human_factors"
      };

      const scenario: ScenarioScope = {
        domain: "generic_display"
      };

      const envelope = resolveReferenceEnvelope({
        metric: "character_visual_angle",
        current_measurement: {
          value: 18,
          unit: "arcmin",
          target: "character_height"
        },
        scenario,
        candidates: [testCandidate]
      });

      expect(envelope.metric).toBe("character_visual_angle");
      expect(envelope.recommended_references).toHaveLength(1);
      expect(envelope.recommended_references[0].reference.value).toBe(16);
      expect(envelope.governing_references).toHaveLength(0);
      expect(envelope.unmatched_references).toHaveLength(0);
    });
  });
});
