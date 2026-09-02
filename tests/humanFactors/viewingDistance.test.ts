import { describe, it, expect } from "vitest";
import {
  validateViewingDistance,
  parseViewingDistanceMm,
  createViewingDistanceEvidence
} from "../../src/humanFactors/viewingDistance";

describe("Human Factors Core: viewingDistance", () => {
  describe("validateViewingDistance", () => {
    it("accepts positive finite numbers", () => {
      expect(validateViewingDistance(500)).toBe(true);
      expect(validateViewingDistance(0.1)).toBe(true);
      expect(validateViewingDistance(2500)).toBe(true);
    });

    it("rejects zero, negative numbers, NaN, and Infinity", () => {
      expect(validateViewingDistance(0)).toBe(false);
      expect(validateViewingDistance(-500)).toBe(false);
      expect(validateViewingDistance(NaN)).toBe(false);
      expect(validateViewingDistance(Infinity)).toBe(false);
      expect(validateViewingDistance(-Infinity)).toBe(false);
      expect(validateViewingDistance(undefined as unknown as number)).toBe(false);
      expect(validateViewingDistance(null as unknown as number)).toBe(false);
    });
  });

  describe("parseViewingDistanceMm", () => {
    it("parses raw numbers directly", () => {
      expect(parseViewingDistanceMm(500)).toBe(500);
      expect(parseViewingDistanceMm(650.5)).toBe(650.5);
    });

    it("parses strings with explicit mm units or omitted unit", () => {
      expect(parseViewingDistanceMm("500 mm")).toBe(500);
      expect(parseViewingDistanceMm("500mm")).toBe(500);
      expect(parseViewingDistanceMm("500")).toBe(500);
    });

    it("parses strings with cm, m, and inch units and normalizes to millimeters", () => {
      expect(parseViewingDistanceMm("50 cm")).toBe(500);
      expect(parseViewingDistanceMm("0.5 m")).toBe(500);
      expect(parseViewingDistanceMm("20 inch")).toBe(508);
      expect(parseViewingDistanceMm('20"')).toBe(508);
      expect(parseViewingDistanceMm("20in")).toBe(508);
    });

    it("rejects invalid, negative, or unparseable input strings without throwing", () => {
      expect(parseViewingDistanceMm("")).toBeNull();
      expect(parseViewingDistanceMm("   ")).toBeNull();
      expect(parseViewingDistanceMm("未指定")).toBeNull();
      expect(parseViewingDistanceMm("-500 mm")).toBeNull();
      expect(parseViewingDistanceMm("0 cm")).toBeNull();
      expect(parseViewingDistanceMm("invalid string")).toBeNull();
      expect(parseViewingDistanceMm(null)).toBeNull();
      expect(parseViewingDistanceMm(undefined)).toBeNull();
    });

    it("does NOT provide any implicit or hardcoded device viewing distance defaults", () => {
      expect(parseViewingDistanceMm("mobile")).toBeNull();
      expect(parseViewingDistanceMm("car")).toBeNull();
      expect(parseViewingDistanceMm("desktop")).toBeNull();
    });
  });

  describe("createViewingDistanceEvidence", () => {
    it("creates structured evidence object for valid distance", () => {
      const evidence = createViewingDistanceEvidence(
        600,
        "user_confirmed",
        "用户输入视距",
        ["假设平视角度"]
      );

      expect(evidence).not.toBeNull();
      expect(evidence!.distance_mm).toBe(600);
      expect(evidence!.source).toBe("user_confirmed");
      expect(evidence!.provenance).toBe("用户输入视距");
      expect(evidence!.assumptions).toEqual(["假设平视角度"]);
    });

    it("returns null for invalid distance", () => {
      expect(createViewingDistanceEvidence(0, "user_confirmed")).toBeNull();
      expect(createViewingDistanceEvidence(-100, "user_confirmed")).toBeNull();
      expect(createViewingDistanceEvidence(NaN, "user_confirmed")).toBeNull();
    });
  });
});
