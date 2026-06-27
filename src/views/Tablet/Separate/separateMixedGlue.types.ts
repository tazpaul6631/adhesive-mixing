export type HeaderInfo = {
  orderNo: string;
  glue: string;
  totalWeight: string;
  totalMixGlueWeight: string;
  totalNoMixGlueWeight: string;
  isNoMixGlue: boolean;
};

export type MixingProcess = {
  component: string;
  weight: string;
  styleName: string;
};

export type SeparateGlueRow = {
  glueId: string;
  selectedRequestDetailIds: string[];
  selectedBucketId: string | null;
  operator: string;
  operatorId: string;
  confirmTime: string | null;
  confirmDate: string | null;
  chemicalId?: string;
  bucketId?: string;
  requestDetailIds?: string[];
};

export type RequestDetailOption = {
  requestDetailId: string;
  requestDetailName: string;
  workOrderWeight: string | number;
  workOrderWeightUnit: string;
  label: string;
};

export type NewComponentFormData = {
  name: string;
  percentage: string | number;
  materialCode: string;
  weightUnit: string;
};

export type PayloadBuildContext = {
  factoryId: string;
  employeeId: string;
  workOrderMasterId: string;
  startDate: string;
  endDate: string;
  mixGlueMasterId: string;
  mixChemicals: any[];
  noMixChemicals: any[];
  separateGlueDetails: any[];
  noMixSeparateGlueDetails: any[];
  extraChietList: any[];
  noMixComponents: any[];
  isNoMixGlue?: boolean;
  apiNoSeparateGlues?: any[];
  apiSeparateGlues?: any[];
  cancelledSeparateGlueDetails?: any[];
  totalNoMixGlueWeight?: string;
};
