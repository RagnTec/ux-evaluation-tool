import type {
  CalibrationMode,
  CalibrationQuality,
  NormalizedBounds,
  PhysicalGeometry
} from "../types/designElement";

/**
 * Parses a display diagonal string like "6.1 inch", "6.1", "12.3 inch" into a number of inches.
 */
export function parseDisplaySize(displaySizeStr: string): number | null {
  if (!displaySizeStr) return null;
  const match = displaySizeStr.match(/(-?[0-9]+(?:.[0-9]+)?)/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return isNaN(val) || val <= 0 ? null : val;
}

/**
 * Parses a resolution string like "1170x2532", "390 x 844", "1920X1080" into width and height.
 */
export function parseResolution(resolutionStr: string): { width: number; height: number } | null {
  if (!resolutionStr) return null;
  const match = resolutionStr.match(/([0-9]+)\s*[xX*×]\s*([0-9]+)/);
  if (!match) return null;
  const w = parseInt(match[1], 10);
  const h = parseInt(match[2], 10);
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;
  return { width: w, height: h };
}

/**
 * Safely resolves configured display size and resolution from preset or custom user inputs.
 * Ensures the literal string "自定义" is never returned as an active parameter value.
 */
export function resolveDisplayParameters(
  formDisplaySize: string,
  formResolution: string,
  customDisplaySize: string,
  customResolution: string
): {
  displaySize: string;
  resolution: string;
  isCustomDisplay: boolean;
  isCustomResolution: boolean;
} {
  const isCustomDisplay = formDisplaySize === "自定义" || formDisplaySize === "custom";
  const isCustomResolution = formResolution === "自定义" || formResolution === "custom";
  const displaySize = isCustomDisplay ? customDisplaySize : formDisplaySize;
  const resolution = isCustomResolution ? customResolution : formResolution;

  return {
    displaySize: displaySize === "自定义" || displaySize === "custom" ? "" : displaySize || "",
    resolution: resolution === "自定义" || resolution === "custom" ? "" : resolution || "",
    isCustomDisplay,
    isCustomResolution
  };
}

export interface PhysicalCalibrationDiagnostic {
  status:
    | "exact_ready"
    | "estimated_ready"
    | "missing_display_size"
    | "missing_resolution"
    | "custom_display_size_missing"
    | "custom_resolution_missing"
    | "invalid_display_size"
    | "invalid_resolution"
    | "aspect_ratio_mismatch"
    | "aspect_ratio_contain_estimated"
    | "cropped_relative_only"
    | "cropped_estimation_enabled";
  quality: CalibrationQuality;
  title: string;
  description: string;
  details?: {
    display_size?: string;
    resolution?: string;
    screenshot_ratio?: number;
    screen_ratio?: number;
    aspect_diff_percent?: number;
  };
  suggested_actions: Array<"check_params" | "switch_to_cropped" | "allow_estimation">;
}

/**
 * Produces designer-facing explanation and diagnostic reasons for physical screen calibration status.
 */
export function getPhysicalCalibrationDiagnostics(
  imageWidth: number,
  imageHeight: number,
  displaySizeInput: string,
  resolutionInput: string,
  calibrationMode: CalibrationMode,
  allowEstimation: boolean = false,
  isCustomDisplay: boolean = false,
  isCustomResolution: boolean = false
): PhysicalCalibrationDiagnostic {
  // Custom screen missing checks
  if (isCustomDisplay && (!displaySizeInput || displaySizeInput.trim() === "" || displaySizeInput === "自定义")) {
    return {
      status: "custom_display_size_missing",
      quality: "relative_only",
      title: "待补充自定义屏幕尺寸",
      description: "已选择自定义屏幕尺寸，但尚未填写有效尺寸（例如 6.1 或 6.1 inch）。",
      suggested_actions: ["check_params"]
    };
  }

  if (isCustomResolution && (!resolutionInput || resolutionInput.trim() === "" || resolutionInput === "自定义")) {
    return {
      status: "custom_resolution_missing",
      quality: "relative_only",
      title: "待补充自定义屏幕分辨率",
      description: "已选择自定义屏幕分辨率，但尚未填写有效分辨率（例如 1170x2532）。",
      suggested_actions: ["check_params"]
    };
  }

  // Standard missing inputs
  if (!displaySizeInput || displaySizeInput.trim() === "" || displaySizeInput === "自定义") {
    return {
      status: "missing_display_size",
      quality: "relative_only",
      title: "缺少屏幕尺寸参数",
      description: "尚未配置设备屏幕对角线尺寸（如 6.1 inch）。",
      suggested_actions: ["check_params"]
    };
  }

  if (!resolutionInput || resolutionInput.trim() === "" || resolutionInput === "自定义") {
    return {
      status: "missing_resolution",
      quality: "relative_only",
      title: "缺少屏幕分辨率参数",
      description: "尚未配置设备屏幕物理分辨率（如 1170x2532）。",
      suggested_actions: ["check_params"]
    };
  }

  const diagonalInch = parseDisplaySize(displaySizeInput);
  if (!diagonalInch) {
    return {
      status: "invalid_display_size",
      quality: "relative_only",
      title: "屏幕尺寸格式无效",
      description: "无法解析屏幕尺寸数值，请输入有效数字（如 6.1 或 6.1 inch）。",
      suggested_actions: ["check_params"]
    };
  }

  const resolution = parseResolution(resolutionInput);
  if (!resolution) {
    return {
      status: "invalid_resolution",
      quality: "relative_only",
      title: "屏幕分辨率格式无效",
      description: "无法解析屏幕分辨率，请输入有效格式（如 1170x2532 或 390x844）。",
      suggested_actions: ["check_params"]
    };
  }

  if (imageWidth <= 0 || imageHeight <= 0) {
    return {
      status: "missing_display_size",
      quality: "relative_only",
      title: "尚未加载设计图",
      description: "请先上传设计图以获取图像分辨率。",
      suggested_actions: []
    };
  }

  // Cropped Screenshot Mode
  if (calibrationMode === "cropped") {
    if (allowEstimation) {
      return {
        status: "cropped_estimation_enabled",
        quality: "estimated",
        title: "局部截图估算已开启",
        description: "当前按所选屏幕的像素密度进行估算，假设局部截图保留原始屏幕像素比例，未经过二次缩放。",
        details: {
          display_size: `${diagonalInch} inch`,
          resolution: `${resolution.width} × ${resolution.height}`
        },
        suggested_actions: []
      };
    }
    return {
      status: "cropped_relative_only",
      quality: "relative_only",
      title: "局部截图（仅相对尺寸）",
      description: "当前为局部截图，无法仅凭截图确认其对应完整屏幕中的实际物理范围。可开启局部估算或作为相对尺寸查看。",
      details: {
        display_size: `${diagonalInch} inch`,
        resolution: `${resolution.width} × ${resolution.height}`
      },
      suggested_actions: ["allow_estimation"]
    };
  }

  // Full-screen Aspect Ratio Match check
  const imgRatio = imageWidth / imageHeight;
  const resRatio = resolution.width / resolution.height;

  const diffDirect = Math.abs(imgRatio - resRatio) / Math.max(imgRatio, resRatio);
  const diffInverted = Math.abs(imgRatio - 1 / resRatio) / Math.max(imgRatio, 1 / resRatio);
  const minDiff = Math.min(diffDirect, diffInverted);
  const matched = minDiff <= 0.05;

  const details = {
    display_size: `${diagonalInch} inch`,
    resolution: `${resolution.width} × ${resolution.height}`,
    screenshot_ratio: Math.round(imgRatio * 1000) / 1000,
    screen_ratio: Math.round(resRatio * 1000) / 1000,
    aspect_diff_percent: Math.round(minDiff * 1000) / 10
  };

  if (matched) {
    return {
      status: "exact_ready",
      quality: "exact",
      title: "已建立精确物理映射",
      description: "截图分辨率比例与目标屏幕参数精确匹配，已计算物理毫米与 PPI。",
      details,
      suggested_actions: []
    };
  }

  if (allowEstimation) {
    return {
      status: "aspect_ratio_contain_estimated",
      quality: "estimated",
      title: "等比贴合粗略估算模式 (Letterbox)",
      description: "当前截图比例与屏幕分辨率不一致。已按等比缩放居中贴合屏幕（假定留黑边）粗略换算内容区物理尺寸。请作为人因参考，非真实物理校准。",
      details,
      suggested_actions: []
    };
  }

  return {
    status: "aspect_ratio_mismatch",
    quality: "relative_only",
    title: "暂无法精确换算物理毫米",
    description: "当前截图比例与所填屏幕分辨率不一致，无法稳定建立完整屏幕的物理尺寸换算。默认保持严格模式；如需人因参考，可在评估参数中开启等比贴合(Letterbox)粗略估算。",
    details,
    suggested_actions: ["allow_estimation", "switch_to_cropped"]
  };
}

/**
 * Calculates physical dimensions and pixel bounds for an element supporting exact, estimated, and relative-only calibration.
 */
export function calculatePhysicalGeometry(
  normalizedBounds: NormalizedBounds,
  imageNaturalWidth: number,
  imageNaturalHeight: number,
  displaySizeStr: string,
  resolutionStr: string,
  calibrationMode: CalibrationMode,
  allowEstimation: boolean = false,
  croppedScaleMode?: string,
  originalImageReferenceWidth?: number
): PhysicalGeometry {
  const width_px = Math.max(1, Math.round(normalizedBounds.width * imageNaturalWidth));
  const height_px = Math.max(1, Math.round(normalizedBounds.height * imageNaturalHeight));

  const diagonalInch = parseDisplaySize(displaySizeStr);
  const resolution = parseResolution(resolutionStr);

  if (!diagonalInch || !resolution || imageNaturalWidth <= 0 || imageNaturalHeight <= 0) {
    return {
      width_px,
      height_px,
      calibration_quality: "relative_only",
      is_calibrated: false,
      calibration_message: "缺少有效屏幕参数，无法进行物理尺寸换算。",
      allow_estimation: false
    };
  }

  // Calculate physical screen dimensions and density
  const d_mm = diagonalInch * 25.4;
  const hypotenuse = Math.sqrt(resolution.width * resolution.width + resolution.height * resolution.height);
  const screen_width_mm = Math.round((d_mm * (resolution.width / hypotenuse)) * 10) / 10;
  const screen_height_mm = Math.round((d_mm * (resolution.height / hypotenuse)) * 10) / 10;
  const ppi = Math.round(hypotenuse / diagonalInch);
  const mm_per_pixel_x = screen_width_mm / resolution.width;
  const mm_per_pixel_y = screen_height_mm / resolution.height;

  // Cropped / Partial Screenshot Mode
  if (calibrationMode === "cropped") {
    if (croppedScaleMode === "preserved_pixel_scale" && originalImageReferenceWidth && originalImageReferenceWidth > 0) {
      const scaleToHardware = resolution.width / originalImageReferenceWidth;
      const effMmPerPixelX = mm_per_pixel_x * scaleToHardware;
      const effMmPerPixelY = mm_per_pixel_y * scaleToHardware;

      const width_mm = Math.round(width_px * effMmPerPixelX * 100) / 100;
      const height_mm = Math.round(height_px * effMmPerPixelY * 100) / 100;

      return {
        width_px,
        height_px,
        width_mm,
        height_mm,
        screen_width_mm,
        screen_height_mm,
        ppi,
        calibration_quality: "estimated",
        is_calibrated: true,
        calibration_message: `基于局部截图保留原完整截图（${originalImageReferenceWidth}px）比例进行物理尺寸估算。`,
        allow_estimation: true
      };
    }

    if (allowEstimation) {
      // Estimated assuming cropped image retains original display pixel scale
      const width_mm = Math.round(width_px * mm_per_pixel_x * 100) / 100;
      const height_mm = Math.round(height_px * mm_per_pixel_y * 100) / 100;

      return {
        width_px,
        height_px,
        width_mm,
        height_mm,
        screen_width_mm,
        screen_height_mm,
        ppi,
        calibration_quality: "estimated",
        is_calibrated: true,
        calibration_message: "按局部截图保留原屏像素比例估算（如果截图经过二次缩放，估算值可能存在比例误差）。",
        allow_estimation: true
      };
    }

    return {
      width_px,
      height_px,
      calibration_quality: "relative_only",
      is_calibrated: false,
      calibration_message: "当前为局部截图且未指定原图比例，无法直接确认实际物理尺寸。",
      allow_estimation: false
    };
  }

  // Full-screen Screenshot Mode: check aspect ratio match
  const imgRatio = imageNaturalWidth / imageNaturalHeight;
  const resRatio = resolution.width / resolution.height;

  const diffDirect = Math.abs(imgRatio - resRatio) / Math.max(imgRatio, resRatio);
  const diffInverted = Math.abs(imgRatio - 1 / resRatio) / Math.max(imgRatio, 1 / resRatio);
  const matched = diffDirect <= 0.05 || diffInverted <= 0.05;

  let effResW = resolution.width;
  let effResH = resolution.height;
  if (diffInverted < diffDirect) {
    effResW = resolution.height;
    effResH = resolution.width;
  }

  const effHypotenuse = Math.sqrt(effResW * effResW + effResH * effResH);
  const eff_screen_w_mm = Math.round((d_mm * (effResW / effHypotenuse)) * 10) / 10;
  const eff_screen_h_mm = Math.round((d_mm * (effResH / effHypotenuse)) * 10) / 10;

  if (matched || allowEstimation) {
    let content_w_mm = eff_screen_w_mm;
    let content_h_mm = eff_screen_h_mm;

    if (!matched) {
      // Contain / Letterbox model: screenshot fits within screen while preserving aspect ratio
      const effScreenRatio = effResW / effResH;
      if (imgRatio > effScreenRatio) {
        // Image is wider than screen relative to height: fits screen width, letterboxes top/bottom
        content_w_mm = eff_screen_w_mm;
        content_h_mm = eff_screen_w_mm / imgRatio;
      } else {
        // Image is taller than screen relative to width: fits screen height, letterboxes left/right
        content_h_mm = eff_screen_h_mm;
        content_w_mm = eff_screen_h_mm * imgRatio;
      }
    }

    const width_mm = Math.round(content_w_mm * normalizedBounds.width * 100) / 100;
    const height_mm = Math.round(content_h_mm * normalizedBounds.height * 100) / 100;
    const isExact1to1 = matched && imageNaturalWidth === effResW && imageNaturalHeight === effResH;

    return {
      width_px,
      height_px,
      width_mm,
      height_mm,
      screen_width_mm: eff_screen_w_mm,
      screen_height_mm: eff_screen_h_mm,
      ppi,
      calibration_quality: isExact1to1 ? "exact" : "estimated",
      is_calibrated: true,
      calibration_message: isExact1to1
        ? "基于硬件参数估算：截图分辨率与屏幕物理分辨率 1:1 对应。"
        : matched
        ? "基于硬件参数估算：上传图片等比例对应目标屏幕可视区域。"
        : "基于等比贴合(Letterbox/Contain)假定粗略估算：假定截图在目标屏幕上等比居中显示（留黑边模式）。结果仅供人因参考，非真实物理校准。",
      allow_estimation: !matched
    };
  }

  // Aspect ratio mismatch under full_screen mode without explicit estimation opt-in: relative only
  return {
    width_px,
    height_px,
    calibration_quality: "relative_only",
    is_calibrated: false,
    calibration_message: "当前截图比例与所填屏幕分辨率不一致，无法稳定建立完整屏幕物理尺寸换算。",
    allow_estimation: false
  };
}

/**
 * Converts mouse client coordinates relative to an element into normalized [0, 1] bounds.
 */
export function calculateNormalizedBounds(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  containerWidth: number,
  containerHeight: number
): NormalizedBounds {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const left = Math.max(0, Math.min(startX, endX));
  const top = Math.max(0, Math.min(startY, endY));
  const right = Math.min(containerWidth, Math.max(startX, endX));
  const bottom = Math.min(containerHeight, Math.max(startY, endY));

  const x = Math.max(0, Math.min(1, left / containerWidth));
  const y = Math.max(0, Math.min(1, top / containerHeight));
  const width = Math.max(0, Math.min(1 - x, (right - left) / containerWidth));
  const height = Math.max(0, Math.min(1 - y, (bottom - top) / containerHeight));

  return {
    x: Math.round(x * 10000) / 10000,
    y: Math.round(y * 10000) / 10000,
    width: Math.round(width * 10000) / 10000,
    height: Math.round(height * 10000) / 10000
  };
}

/**
 * Moves normalized bounding box by delta [dX, dY] ensuring it remains strictly within [0, 1].
 */
export function moveBounds(
  bounds: NormalizedBounds,
  deltaNormX: number,
  deltaNormY: number
): NormalizedBounds {
  const clampedX = Math.max(0, Math.min(1 - bounds.width, bounds.x + deltaNormX));
  const clampedY = Math.max(0, Math.min(1 - bounds.height, bounds.y + deltaNormY));

  return {
    x: Math.round(clampedX * 10000) / 10000,
    y: Math.round(clampedY * 10000) / 10000,
    width: bounds.width,
    height: bounds.height
  };
}

/**
 * Resizes normalized bounding box by dragging a corner handle (nw, ne, sw, se).
 */
export function resizeBounds(
  bounds: NormalizedBounds,
  handle: "nw" | "ne" | "sw" | "se",
  deltaNormX: number,
  deltaNormY: number,
  minSize: number = 0.01
): NormalizedBounds {
  let left = bounds.x;
  let top = bounds.y;
  let right = bounds.x + bounds.width;
  let bottom = bounds.y + bounds.height;

  if (handle === "nw") {
    left = Math.max(0, Math.min(right - minSize, left + deltaNormX));
    top = Math.max(0, Math.min(bottom - minSize, top + deltaNormY));
  } else if (handle === "ne") {
    right = Math.min(1, Math.max(left + minSize, right + deltaNormX));
    top = Math.max(0, Math.min(bottom - minSize, top + deltaNormY));
  } else if (handle === "sw") {
    left = Math.max(0, Math.min(right - minSize, left + deltaNormX));
    bottom = Math.min(1, Math.max(top + minSize, bottom + deltaNormY));
  } else if (handle === "se") {
    right = Math.min(1, Math.max(left + minSize, right + deltaNormX));
    bottom = Math.min(1, Math.max(top + minSize, bottom + deltaNormY));
  }

  const width = Math.max(minSize, right - left);
  const height = Math.max(minSize, bottom - top);

  return {
    x: Math.round(left * 10000) / 10000,
    y: Math.round(top * 10000) / 10000,
    width: Math.round(width * 10000) / 10000,
    height: Math.round(height * 10000) / 10000
  };
}

/**
 * Maps CSS client click coordinates onto the stage, normalized space, and natural image pixels.
 */
export function mapClientToNaturalPixel(
  clientX: number,
  clientY: number,
  stageRect: { left: number; top: number; width: number; height: number },
  naturalWidth: number,
  naturalHeight: number
): { normX: number; normY: number; pixelX: number; pixelY: number } {
  if (stageRect.width <= 0 || stageRect.height <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
    return { normX: 0, normY: 0, pixelX: 0, pixelY: 0 };
  }

  const relX = Math.max(0, Math.min(stageRect.width, clientX - stageRect.left));
  const relY = Math.max(0, Math.min(stageRect.height, clientY - stageRect.top));

  const normX = Math.max(0, Math.min(1, relX / stageRect.width));
  const normY = Math.max(0, Math.min(1, relY / stageRect.height));

  const pixelX = Math.max(0, Math.min(naturalWidth - 1, Math.floor(normX * naturalWidth)));
  const pixelY = Math.max(0, Math.min(naturalHeight - 1, Math.floor(normY * naturalHeight)));

  return {
    normX: Math.round(normX * 10000) / 10000,
    normY: Math.round(normY * 10000) / 10000,
    pixelX,
    pixelY
  };
}
