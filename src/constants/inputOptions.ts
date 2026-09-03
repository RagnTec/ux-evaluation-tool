export type DeviceProfileKey = 'mobile' | 'tablet' | 'vehicleCenterDisplay' | 'vehicleCluster' | 'appliance' | 'wearable' | 'publicKiosk' | 'custom';

export interface DeviceProfile {
  label: string;
  defaultDisplaySize: string;
  defaultResolution: string;
  defaultViewingDistance: string;
  defaultUsageContext: string;
  displaySizes: string[];
  resolutions: string[];
  viewingDistances: string[];
  usageContexts: string[];
}

const customOption = '自定义';

export const deviceProfiles: Record<DeviceProfileKey, DeviceProfile> = {
  mobile: {
    label: '移动端',
    defaultDisplaySize: '6.1 inch',
    defaultResolution: '390x844',
    defaultViewingDistance: '30cm',
    defaultUsageContext: '移动端 App - 室内',
    displaySizes: ['5.4 inch', '6.1 inch', '6.3 inch', '6.7 inch', '6.9 inch', customOption],
    resolutions: ['375x812', '390x844', '393x852', '402x874', '430x932', '1170x2532', '1290x2796', '1320x2868', customOption],
    viewingDistances: ['25cm', '30cm', '35cm', '45cm', customOption],
    usageContexts: ['移动端 App - 室内', '移动端 App - 户外', '移动端 App - 单手操作', customOption]
  },
  tablet: {
    label: '平板',
    defaultDisplaySize: '11 inch',
    defaultResolution: '834x1194',
    defaultViewingDistance: '45cm',
    defaultUsageContext: '平板桌面操作',
    displaySizes: ['8.3 inch', '10.9 inch', '11 inch', '12.9 inch', '13 inch', customOption],
    resolutions: ['820x1180', '834x1194', '1024x1366', '1280x800', '2048x2732', customOption],
    viewingDistances: ['35cm', '45cm', '60cm', '80cm', customOption],
    usageContexts: ['平板桌面操作', '移动端 App - 室内', '移动端 App - 户外', customOption]
  },
  vehicleCenterDisplay: {
    label: '车机中控',
    defaultDisplaySize: '12.3 inch',
    defaultResolution: '1920x720',
    defaultViewingDistance: '80cm',
    defaultUsageContext: '车机行驶中',
    displaySizes: ['10.25 inch', '12.3 inch', '14.6 inch', '15.6 inch', '17.3 inch', customOption],
    resolutions: ['1280x720', '1920x720', '1920x1080', '2560x720', '2560x1440', customOption],
    viewingDistances: ['60cm', '80cm', '100cm', '120cm', customOption],
    usageContexts: ['车机行驶中', '车机驻车', customOption]
  },
  vehicleCluster: {
    label: '车机仪表',
    defaultDisplaySize: '12.3 inch',
    defaultResolution: '1920x720',
    defaultViewingDistance: '80cm',
    defaultUsageContext: '车机行驶中',
    displaySizes: ['10.25 inch', '12.3 inch', '14.6 inch', customOption],
    resolutions: ['1280x480', '1920x720', '1920x1080', '2560x720', customOption],
    viewingDistances: ['60cm', '80cm', '100cm', customOption],
    usageContexts: ['车机行驶中', '车机驻车', customOption]
  },
  appliance: {
    label: '家电屏幕',
    defaultDisplaySize: '7 inch',
    defaultResolution: '800x480',
    defaultViewingDistance: '60cm',
    defaultUsageContext: '家电近距离操作',
    displaySizes: ['3.5 inch', '5 inch', '7 inch', '10.1 inch', '15.6 inch', customOption],
    resolutions: ['480x320', '800x480', '1024x600', '1280x800', customOption],
    viewingDistances: ['45cm', '60cm', '80cm', '120cm', customOption],
    usageContexts: ['家电近距离操作', '家电远距离查看', customOption]
  },
  wearable: {
    label: '可穿戴',
    defaultDisplaySize: '1.9 inch',
    defaultResolution: '410x502',
    defaultViewingDistance: '30cm',
    defaultUsageContext: '可穿戴快速查看',
    displaySizes: ['1.5 inch', '1.9 inch', '2.0 inch', customOption],
    resolutions: ['396x484', '410x502', '466x466', '480x480', customOption],
    viewingDistances: ['25cm', '30cm', '35cm', customOption],
    usageContexts: ['可穿戴快速查看', customOption]
  },
  publicKiosk: {
    label: '公共设备',
    defaultDisplaySize: '15.6 inch',
    defaultResolution: '1920x1080',
    defaultViewingDistance: '80cm',
    defaultUsageContext: '公共设备站立操作',
    displaySizes: ['10.1 inch', '15.6 inch', '17.3 inch', customOption],
    resolutions: ['1024x768', '1280x800', '1920x1080', '2160x3840', customOption],
    viewingDistances: ['60cm', '80cm', '100cm', '120cm', customOption],
    usageContexts: ['公共设备站立操作', customOption]
  },
  custom: {
    label: '自定义',
    defaultDisplaySize: customOption,
    defaultResolution: customOption,
    defaultViewingDistance: customOption,
    defaultUsageContext: customOption,
    displaySizes: [customOption],
    resolutions: [customOption],
    viewingDistances: [customOption],
    usageContexts: [customOption]
  }
};

export const deviceTypeOptions = Object.entries(deviceProfiles).map(([value, profile]) => ({ value: value as DeviceProfileKey, label: profile.label }));
export const userGroupOptions = ['通用用户', '东亚用户', '欧美用户', '男性', '女性', '老年用户', '低视力用户', '手指偏大用户'];
export const ruleSetOptions = ['WCAG 2.2', 'Apple HIG', 'Android Accessibility', 'Human Factors', 'Automotive HMI'];
export const dimensionOptions = ['触控目标', '目标间距 / 误触风险', '色彩对比', '文字可读性', '信息层级', '认知负荷'];

import type { ScenarioDomain } from "../types/context";

export type ScenarioDomainOption = ScenarioDomain;

export const SCENARIO_DOMAIN_OPTIONS: { value: ScenarioDomainOption; label: string }[] = [
  { value: "mobile", label: "移动设备" },
  { value: "desktop", label: "桌面 / Web" },
  { value: "automotive", label: "车载" },
  { value: "unknown", label: "通用 / 未指定" }
];

export function deriveDomainFromDevice(deviceProfileOrHardware: string): ScenarioDomainOption {
  if (!deviceProfileOrHardware) return "unknown";
  const lower = deviceProfileOrHardware.toLowerCase();
  if (
    lower.includes("vehicle") ||
    lower.includes("car") ||
    lower.includes("车机") ||
    lower.includes("hud") ||
    lower.includes("车载")
  ) {
    return "automotive";
  }
  if (
    lower.includes("mobile") ||
    lower.includes("phone") ||
    lower.includes("tablet") ||
    lower.includes("pad") ||
    lower.includes("手机") ||
    lower.includes("平板")
  ) {
    return "mobile";
  }
  if (
    lower.includes("laptop") ||
    lower.includes("desktop") ||
    lower.includes("monitor") ||
    lower.includes("pc") ||
    lower.includes("mac") ||
    lower.includes("桌面") ||
    lower.includes("笔记本") ||
    lower.includes("显示器")
  ) {
    return "desktop";
  }
  return "unknown";
}

export function getDeviceLogicalWidth(
  deviceProfileOrPreset: string,
  platform?: string
): number | null {
  if (!deviceProfileOrPreset) return null;
  const lower = deviceProfileOrPreset.toLowerCase();

  if (lower.includes("mobile_std") || lower === "mobile") {
    return platform === "android" ? 360 : 390;
  }
  if (lower.includes("mobile_large")) {
    return platform === "android" ? 412 : 430;
  }
  if (lower.includes("tablet") || lower.includes("pad")) {
    return platform === "android" ? 800 : 834;
  }
  if (lower.includes("vehicle") || lower.includes("车机")) {
    return 1920;
  }
  if (lower.includes("laptop_13")) {
    return 1280;
  }
  if (lower.includes("laptop_15") || lower.includes("monitor_27")) {
    return 1920;
  }
  return null;
}
