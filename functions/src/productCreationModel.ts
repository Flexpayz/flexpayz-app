import {createHash, randomBytes} from "crypto";

export const PRODUCT_TYPES = {
  FLEX_RING: "flex-ring",
  FLEX_CARD: "flex-card",
  FLEX_BRACELET: "flex-bracelet",
  PET_TAG: "pet-tag",
  GENERIC: "generic",
} as const;

export type ProductType = typeof PRODUCT_TYPES[keyof typeof PRODUCT_TYPES];

export type Preview =
  | "business_card"
  | "custom_link"
  | "upload_file"
  | "upload_video"
  | "upload-songs"
  | "baby-journal"
  | "adult-journal"
  | "animal_tag";

export type CapabilityId =
  | "business_card"
  | "custom_link"
  | "upload_files"
  | "upload_video"
  | "upload_songs"
  | "baby_journal"
  | "adult_journal"
  | "animal_tag";

export interface ProductCreationRequest {
  requestId: string;
  mode: "single" | "multiple";
  productType: ProductType;
  quantity: number;
  name?: string;
  capabilities: CapabilityId[];
}

export interface ProductCreationResultItem {
  requestItemId: string;
  status: "created" | "failed";
  productId?: string;
  unlockCode?: string;
  productType: ProductType;
  name: string;
  capabilities: CapabilityId[];
  error?: string;
  createdAt?: string;
}

export interface ProductCreationResponse {
  requestId: string;
  results: ProductCreationResultItem[];
}

export interface Permissions {
  business_card: boolean;
  custom_link: boolean;
  upload_files: boolean;
  upload_video: boolean;
  upload_songs: boolean;
  baby_journal: boolean;
  adult_journal: boolean;
  animal_tag: boolean;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  [PRODUCT_TYPES.FLEX_RING]: "Flex Ring",
  [PRODUCT_TYPES.FLEX_CARD]: "Flex Card",
  [PRODUCT_TYPES.FLEX_BRACELET]: "Flex Bracelet",
  [PRODUCT_TYPES.PET_TAG]: "Pet Tag",
  [PRODUCT_TYPES.GENERIC]: "Generic/Unknown Product",
};

export const PRODUCT_CAPABILITIES: Array<{id: CapabilityId; preview: Preview; auxiliaryCollection?: string}> = [
  {id: "business_card", preview: "business_card"},
  {id: "custom_link", preview: "custom_link"},
  {id: "upload_files", preview: "upload_file"},
  {id: "upload_video", preview: "upload_video"},
  {id: "upload_songs", preview: "upload-songs"},
  {id: "baby_journal", preview: "baby-journal", auxiliaryCollection: "baby_journals"},
  {id: "adult_journal", preview: "adult-journal", auxiliaryCollection: "adult_journals"},
  {id: "animal_tag", preview: "animal_tag", auxiliaryCollection: "animal_tag"},
];

const PRODUCT_TYPE_VALUES = new Set<string>(Object.values(PRODUCT_TYPES));
const CAPABILITY_VALUES = new Set<string>(PRODUCT_CAPABILITIES.map((capability) => capability.id));

export function normalizeCreationRequest(raw: unknown, maxQuantity: number): ProductCreationRequest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Request body must be an object.");
  }

  const data = raw as Record<string, unknown>;
  rejectUnknownFields(data, ["requestId", "mode", "productType", "quantity", "name", "capabilities"]);

  const requestId = requiredString(data.requestId, "requestId", 120);
  const mode = data.mode === "multiple" ? "multiple" : data.mode === "single" ? "single" : null;
  if (!mode) throw new Error("Unsupported creation mode.");

  const productType = requiredString(data.productType, "productType", 80);
  if (!PRODUCT_TYPE_VALUES.has(productType)) throw new Error("Unsupported product type.");

  const quantity = Number(data.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be at least 1.");
  if (quantity > maxQuantity) throw new Error(`Quantity cannot exceed ${maxQuantity}.`);
  if (mode === "single" && quantity !== 1) throw new Error("Single-product creation must use quantity 1.");

  const name = typeof data.name === "string" ? data.name.trim().slice(0, 120) : undefined;
  if (!Array.isArray(data.capabilities)) throw new Error("Capabilities must be an array.");
  const capabilities = data.capabilities.map((capability) => {
    if (typeof capability !== "string" || !CAPABILITY_VALUES.has(capability)) {
      throw new Error("Unsupported capability selected.");
    }
    return capability as CapabilityId;
  });
  const uniqueCapabilities = PRODUCT_CAPABILITIES
    .map((capability) => capability.id)
    .filter((capability) => capabilities.includes(capability));
  if (uniqueCapabilities.length === 0) throw new Error("At least one capability is required.");

  return {
    requestId,
    mode,
    productType: productType as ProductType,
    quantity,
    name,
    capabilities: uniqueCapabilities,
  };
}

export function createRequestHash(request: ProductCreationRequest): string {
  return createHash("sha256")
    .update(JSON.stringify({
      mode: request.mode,
      productType: request.productType,
      quantity: request.quantity,
      name: request.name || "",
      capabilities: request.capabilities,
    }))
    .digest("hex");
}

export function capabilitySelectionToPermissions(selection: CapabilityId[]): Permissions {
  const selected = new Set(selection);
  return PRODUCT_CAPABILITIES.reduce<Permissions>((permissions, capability) => ({
    ...permissions,
    [capability.id]: selected.has(capability.id),
  }), {
    business_card: false,
    custom_link: false,
    upload_files: false,
    upload_video: false,
    upload_songs: false,
    baby_journal: false,
    adult_journal: false,
    animal_tag: false,
  });
}

export function capabilitySelectionToVisibleSections(selection: CapabilityId[]): Preview[] {
  const selected = new Set(selection);
  return PRODUCT_CAPABILITIES
    .filter((capability) => selected.has(capability.id))
    .map((capability) => capability.preview);
}

export function requiredAuxiliaryCollections(selection: CapabilityId[]): string[] {
  const selected = new Set(selection);
  const collections = PRODUCT_CAPABILITIES
    .filter((capability) => selected.has(capability.id) && capability.auxiliaryCollection)
    .map((capability) => capability.auxiliaryCollection as string);
  return collections.filter((collection, index) => collections.indexOf(collection) === index);
}

export function getProductName(productType: ProductType, name?: string): string {
  return name?.trim() || PRODUCT_TYPE_LABELS[productType];
}

export function generateUnlockCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function rejectUnknownFields(data: Record<string, unknown>, allowed: string[]) {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(data).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) throw new Error(`Unknown request field: ${unknown[0]}.`);
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`${field} is too long.`);
  return trimmed;
}

