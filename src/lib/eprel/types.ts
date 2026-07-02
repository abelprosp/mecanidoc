export type EprelProductDetail = {
  registrationNumber?: string;
  brandName?: string;
  modelIdentifier?: string;
  energyClass?: string;
  productGroup?: string;
  energyLabelUrl?: string;
  productInformationSheetUrl?: string;
  technicalParameters?: Record<string, unknown>;
  supplierOrTrademark?: string;
  commercialName?: string;
  gtin?: string;
};

export type EprelEnrichPatch = {
  name?: string;
  brand?: string;
  description?: string;
  specs?: Record<string, unknown>;
  labels?: Record<string, unknown>;
  eprelMetadata?: Record<string, unknown>;
};
