import { DesignElement, LogicalUnitMapping } from "../types/designElement";

export interface ImageWorkflowState {
  imageUrl?: string;
  imageBlob?: Blob;
  imageName?: string;
  imageNaturalDimensions: { width: number; height: number } | null;
  manualElements: DesignElement[];
  activeElementId: string | null;
  logicalMapping?: LogicalUnitMapping;
  imageRefWidthInput: string;
  logicalRefWidthInput: string;
  imageRefHeightInput: string;
  logicalRefHeightInput: string;
  originalFullImageWidthInput: string;
}

/**
 * Returns true if replacing the current image requires explicit user confirmation.
 * Safe replacement rule: If there are real manual elements on the current image,
 * replacement must be confirmed to prevent applying obsolete coordinates to a new image.
 */
export function shouldConfirmImageReplacement(elementCount: number): boolean {
  return elementCount > 0;
}

/**
 * Clears image-specific and element-specific state when a new image is loaded,
 * while preserving global hardware and environmental parameters.
 */
export function createCleanReplacementState<T extends ImageWorkflowState>(
  prevState: T,
  newImage: {
    url: string;
    blob: Blob;
    name: string;
    naturalDimensions: { width: number; height: number };
  }
): T {
  return {
    ...prevState,
    imageUrl: newImage.url,
    imageBlob: newImage.blob,
    imageName: newImage.name,
    imageNaturalDimensions: newImage.naturalDimensions,
    manualElements: [],
    activeElementId: null,
    logicalMapping: undefined,
    imageRefWidthInput: "",
    logicalRefWidthInput: "",
    imageRefHeightInput: "",
    logicalRefHeightInput: "",
    originalFullImageWidthInput: ""
  };
}
