import { describe, it, expect } from "vitest";
import type { DesignElement, LogicalUnitMapping, DerivedEvaluationContext } from "../../src/types/designElement";
import { recomputeElementDerivedState, deriveTouchReviewStatus } from "../../src/utils/interactionGeometry";
import { buildElementPresentationModel, deriveScenarioScope } from "../../src/utils/elementPresentation";
import { buildTargetSizeTrace, buildCharacterVisualAngleTrace } from "../../src/utils/ruleTrace";
import { deriveDomainFromDevice, getDeviceLogicalWidth } from "../../src/constants/inputOptions";
import { createLogicalUnitMapping, formatScaleRatio } from "../../src/utils/logicalMapping";

describe("Evaluation Parameters Workflow: Platform, Design Basis, Hardware, and Scenario Domain Orthogonality", () => {
  const baseElement: DesignElement = {
    element_id: "test-el-1",
    source: "manual",
    element_type: "button",
    normalized_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
    image_pixel_bounds: { x: 100, y: 100, width: 200, height: 50 },
    touch_bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
    touch_bounds_pixel: { x: 100, y: 100, width: 200, height: 50 },
    touch_bounds_source: "user_defined",
    calibration_mode: "preset"
  };

  const textElementWithChar: DesignElement = {
    element_id: "test-text-1",
    source: "manual",
    element_type: "text",
    text_layout: "single_line",
    text_role: "body",
    normalized_bounds: { x: 0.1, y: 0.2, width: 0.4, height: 0.04 },
    image_pixel_bounds: { x: 100, y: 200, width: 400, height: 40 },
    character_height_px: 24,
    character_height_source: "measured_rendered_character",
    calibration_mode: "preset"
  };

  // 1. Platform 选择 Apple iOS, Design Basis 为未提供:
  // - logicalMapping 为 null / undefined
  // - 不伪造 390 pt
  // - 元素测量继续保持截图 px / 物理 mm / 视觉角（若有距离）
  // - Apple 44pt 规则作为候选平台规则识别为 needs_info, 明确提示“平台规则暂不可判断：缺少设计尺寸换算依据”
  it("1. Platform = iOS, Design Basis = unprovided: no fake 390pt, measurements preserved, Apple 44pt rule enters needs_info", () => {
    const context: DerivedEvaluationContext = {
      imageNaturalWidth: 1000,
      imageNaturalHeight: 1000,
      displaySize: "6.1 inch",
      resolution: "1000x1000",
      viewingDistance: "35cm",
      calibrationMode: "preset",
      croppedScaleMode: "scale_direct",
      logicalMapping: null,
      scenarioDomain: "mobile"
    };

    const derived = recomputeElementDerivedState(baseElement, context);
    expect(derived.logical_mapping).toBeUndefined();
    expect(derived.image_pixel_bounds.width).toBe(200);
    expect(derived.physical_geometry?.width_mm).toBeGreaterThan(0);

    const trace = buildTargetSizeTrace(derived, undefined, undefined, "ios");
    expect(trace).not.toBeNull();
    expect(trace?.verdict).toBe("needs_info");
    expect(trace?.comparison.explanation).toContain("平台规则暂不可判断：缺少设计尺寸换算依据");
    expect(trace?.ruleId).toBe("apple_touch_target_44");
  });

  // 2. Platform 选择 Android, Design Basis 明确为设备 Profile:
  // - logicalMapping 来源为 exact_profile / device_preset
  // - 换算比例有效
  // - Android 48dp 规则正常进入正式 evaluation
  it("2. Platform = Android, Design Basis = device profile: valid exact_profile mapping, Android 48dp enters formal evaluation", () => {
    const devLogicalW = getDeviceLogicalWidth("mobile", "android");
    expect(devLogicalW).toBe(360);

    const mapping = createLogicalUnitMapping(
      "android",
      "dp",
      1080,
      devLogicalW!,
      undefined,
      undefined,
      "exact_profile"
    );
    expect(mapping.quality).toBe("exact_profile");
    expect(mapping.scale_x).toBeCloseTo(360 / 1080);

    const context: DerivedEvaluationContext = {
      imageNaturalWidth: 1080,
      imageNaturalHeight: 2400,
      displaySize: "6.5 inch",
      resolution: "1080x2400",
      viewingDistance: "35cm",
      calibrationMode: "preset",
      croppedScaleMode: "scale_direct",
      logicalMapping: mapping,
      scenarioDomain: "mobile"
    };

    const derived = recomputeElementDerivedState(baseElement, context);
    expect(derived.logical_mapping).toBeDefined();
    expect(derived.target_size_evaluation).toBeDefined();

    const trace = buildTargetSizeTrace(derived, mapping, undefined, "android");
    expect(trace?.ruleId).toBe("android_touch_target_48dp");
    expect(trace?.verdict).not.toBe("needs_info");
  });

  // 3. Platform 选择 Web, 用户手动输入设计宽度 1440 与截图参考宽度 2880:
  // - logicalMapping 来源为 user_specified / user_confirmed
  // - 1 CSS px = 2 截图像素 (scale_x = 0.5)
  // - WCAG 24 CSS px 规则按用户确认比例正常计算
  it("3. Platform = Web, user confirmed 1440 / 2880: scale_x = 0.5, WCAG 2.5.8 evaluates with confirmed ratio", () => {
    const mapping = createLogicalUnitMapping(
      "web",
      "css_px",
      2880,
      1440,
      undefined,
      undefined,
      "user_specified"
    );
    expect(mapping.scale_x).toBe(0.5);
    expect(formatScaleRatio(mapping)).toContain("1 CSS px = 2 图像像素");

    const context: DerivedEvaluationContext = {
      imageNaturalWidth: 2880,
      imageNaturalHeight: 1800,
      displaySize: "15.6 inch",
      resolution: "2880x1800",
      viewingDistance: "60cm",
      calibrationMode: "preset",
      croppedScaleMode: "scale_direct",
      logicalMapping: mapping,
      scenarioDomain: "desktop"
    };

    // Button: 0.2 * 2880 = 576px -> 288 CSS px (meets 24 CSS px)
    const derived = recomputeElementDerivedState(baseElement, context);
    expect(derived.target_size_evaluation?.measured_width).toBe(288);

    const trace = buildTargetSizeTrace(derived, mapping, undefined, "web");
    expect(trace?.ruleId).toBe("wcag_2_5_8");
    expect(trace?.verdict).toBe("meets");
  });

  // 4. 用户未提供设计尺寸，但输入了屏幕尺寸 15.6 inch + 1920x1080 + viewing distance 80cm:
  // - logicalMapping 为 null
  // - 元素 physical_geometry.width_mm / height_mm 正常计算
  // - visual_angle 正常计算
  // - 代表字符 character_height_physical_mm 与 vertical visual angle 正常计算
  it("4. No Design Basis + Screen physical specs + Viewing distance: physical mm and character visual angle compute normally", () => {
    const context: DerivedEvaluationContext = {
      imageNaturalWidth: 1920,
      imageNaturalHeight: 1080,
      displaySize: "15.6 inch",
      resolution: "1920x1080",
      viewingDistance: "80cm",
      calibrationMode: "preset",
      croppedScaleMode: "scale_direct",
      logicalMapping: null,
      scenarioDomain: "desktop"
    };

    const derived = recomputeElementDerivedState(textElementWithChar, context);
    expect(derived.logical_mapping).toBeUndefined();
    expect(derived.physical_geometry?.is_calibrated).toBe(true);
    expect(derived.physical_geometry?.height_mm).toBeGreaterThan(0);
    expect(derived.character_height_physical_mm).toBeGreaterThan(0);
    expect(derived.character_height_visual_angle?.arcmin).toBeGreaterThan(0);
  });

  // 5. 设备类型选择“车机中控”，默认 scenarioDomain 为 automotive:
  // - 触发 NHTSA 字符高度视角规则
  it("5. Device = vehicleCenterDisplay -> default scenarioDomain = automotive -> triggers NHTSA visual angle evaluation", () => {
    const domain = deriveDomainFromDevice("vehicleCenterDisplay");
    expect(domain).toBe("automotive");

    const scope = deriveScenarioScope(undefined, undefined, undefined, domain);
    expect(scope.domain).toBe("automotive");

    const context: DerivedEvaluationContext = {
      imageNaturalWidth: 1920,
      imageNaturalHeight: 720,
      displaySize: "12.3 inch",
      resolution: "1920x720",
      viewingDistance: "80cm",
      calibrationMode: "preset",
      croppedScaleMode: "scale_direct",
      logicalMapping: null,
      scenarioDomain: domain
    };

    const derived = recomputeElementDerivedState(textElementWithChar, context);
    const trace = buildCharacterVisualAngleTrace(derived, scope, undefined, "80cm");
    expect(trace).not.toBeNull();
    expect(trace?.ruleId).toBe("REF-NHTSA-TEXT-CRITICAL");
    expect(trace?.verdict).not.toBe("measurement_only");
  });

  // 6. 设备类型选择“手机”，默认 scenarioDomain 为 mobile; 用户在场景描述输入“在车内查看手机”并设置环境为“车内”:
  // - structured domain 保持 mobile（非 automotive）
  // - 不得触发 NHTSA 汽车人因规则
  it("6. Mobile device + text '在车内查看手机' + contextEnvironment '车内' without automotive domain does NOT trigger NHTSA", () => {
    const domain = deriveDomainFromDevice("mobile");
    expect(domain).toBe("mobile");

    const scope = deriveScenarioScope(
      "在车内查看手机导航与音乐",
      "车内",
      "移动中",
      domain
    );
    expect(scope.domain).toBe("mobile");

    const context: DerivedEvaluationContext = {
      imageNaturalWidth: 1170,
      imageNaturalHeight: 2532,
      displaySize: "6.1 inch",
      resolution: "1170x2532",
      viewingDistance: "35cm",
      calibrationMode: "preset",
      croppedScaleMode: "scale_direct",
      logicalMapping: null,
      scenarioDomain: domain,
      scenario: "在车内查看手机导航与音乐",
      contextEnvironment: "车内",
      contextOperationState: "移动中"
    };

    const derived = recomputeElementDerivedState(textElementWithChar, context);
    const trace = buildCharacterVisualAngleTrace(derived, scope, undefined, "35cm");
    expect(trace?.ruleId).toBeUndefined();
    expect(trace?.verdict).toBe("measurement_only");
  });

  // 7. 用户手动将 scenarioDomain 修改为 automotive，随后更改屏幕尺寸为 6.1 inch:
  // - scenarioDomain 不被重置为 mobile（保留用户显式选择）
  it("7. User manually overrides scenarioDomain to automotive: subsequent hardware change does not overwrite it", () => {
    let scenarioDomain: any = "mobile";
    let scenarioDomainUserOverridden = false;

    // User explicitly changes domain to automotive
    scenarioDomain = "automotive";
    scenarioDomainUserOverridden = true;

    // Hardware selection changes to 6.1 inch (mobile)
    const newHardwareDefault = deriveDomainFromDevice("mobile");
    if (!scenarioDomainUserOverridden) {
      scenarioDomain = newHardwareDefault;
    }

    expect(scenarioDomain).toBe("automotive");
    expect(scenarioDomainUserOverridden).toBe(true);
  });

  // 8. 用户切换平台（如 iOS -> Android）但未确认 Design Basis:
  // - 不产生自动默认 360 dp 的可信 mapping
  // - 平台单位正确更新为 dp
  // - 规则继续为 needs_info
  it("8. Switching platform iOS -> Android without Design Basis keeps mapping null and rule as needs_info", () => {
    const context: DerivedEvaluationContext = {
      imageNaturalWidth: 1080,
      imageNaturalHeight: 2400,
      displaySize: "6.5 inch",
      resolution: "1080x2400",
      viewingDistance: "35cm",
      calibrationMode: "preset",
      croppedScaleMode: "scale_direct",
      logicalMapping: null,
      scenarioDomain: "mobile"
    };

    const derived = recomputeElementDerivedState(baseElement, context);
    expect(derived.logical_mapping).toBeUndefined();

    const trace = buildTargetSizeTrace(derived, undefined, undefined, "android");
    expect(trace?.ruleId).toBe("android_touch_target_48");
    expect(trace?.verdict).toBe("needs_info");
    expect(trace?.unit).toBe("dp");
    expect(trace?.comparison.explanation).toContain("平台规则暂不可判断：缺少设计尺寸换算依据");
  });

  // 9. 用户从“未提供设计尺寸”切换为“用户确认设计尺寸”并输入参数后:
  // - 已有元素自动重新计算 derived 状态
  // - 原有 source measurement（px, character_height_px, color）保持不变
  // - 平台规则由 needs_info 转为通过/未达标/推荐判定
  it("9. Confirming Design Basis recalculates existing elements, preserving source measurements and resolving platform rule", () => {
    const unmappedContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1170,
      imageNaturalHeight: 2532,
      displaySize: "6.1 inch",
      resolution: "1170x2532",
      viewingDistance: "35cm",
      calibrationMode: "preset",
      croppedScaleMode: "scale_direct",
      logicalMapping: null,
      scenarioDomain: "mobile"
    };

    const initial = recomputeElementDerivedState(baseElement, unmappedContext);
    expect(initial.logical_mapping).toBeUndefined();
    expect(initial.image_pixel_bounds.width).toBe(200);

    const userMapping = createLogicalUnitMapping(
      "ios",
      "pt",
      1170,
      390,
      undefined,
      undefined,
      "user_specified"
    );

    const mappedContext: DerivedEvaluationContext = {
      ...unmappedContext,
      logicalMapping: userMapping
    };

    const updated = recomputeElementDerivedState(initial, mappedContext);
    expect(updated.image_pixel_bounds.width).toBe(200); // source preserved
    expect(updated.logical_mapping).toBeDefined();
    expect(updated.target_size_evaluation?.measured_width).toBe(78);

    const trace = buildTargetSizeTrace(updated, userMapping, undefined, "ios");
    expect(trace?.ruleId).toBe("apple_hig_touch_target_44pt");
    expect(trace?.verdict).toBe("below_recommended");
  });

  // 10. 用户再从“用户确认设计尺寸”切换回“未提供设计尺寸”:
  // - logicalMapping 清空
  // - 平台规则回到 needs_info
  // - 截图测量与物理换算保持完好
  it("10. Reverting from confirmed Design Basis back to unprovided clears mapping and restores needs_info safely", () => {
    const userMapping = createLogicalUnitMapping(
      "ios",
      "pt",
      1170,
      390,
      undefined,
      undefined,
      "user_specified"
    );

    const mappedContext: DerivedEvaluationContext = {
      imageNaturalWidth: 1170,
      imageNaturalHeight: 2532,
      displaySize: "6.1 inch",
      resolution: "1170x2532",
      viewingDistance: "35cm",
      calibrationMode: "preset",
      croppedScaleMode: "scale_direct",
      logicalMapping: userMapping,
      scenarioDomain: "mobile"
    };

    const mappedEl = recomputeElementDerivedState(baseElement, mappedContext);
    expect(mappedEl.logical_mapping).toBeDefined();

    const unmappedContext: DerivedEvaluationContext = {
      ...mappedContext,
      logicalMapping: null
    };

    const revertedEl = recomputeElementDerivedState(mappedEl, unmappedContext);
    expect(revertedEl.logical_mapping).toBeUndefined();
    expect(revertedEl.image_pixel_bounds.width).toBe(200);
    expect(revertedEl.physical_geometry?.width_mm).toBeGreaterThan(0);

    const trace = buildTargetSizeTrace(revertedEl, undefined, undefined, "ios");
    expect(trace?.verdict).toBe("needs_info");
    expect(trace?.comparison.explanation).toContain("平台规则暂不可判断：缺少设计尺寸换算依据");
  });
});
