export interface GlueQrInfo {
  qrText: string;
  glueName: string;
  workshop: string;
  workOrder: string;
  shape: string;
  productionLine: string;
  returnWeight: string;
}

export type GlueInfoField = {
  label: string;
  value: string;
};

export const mockGlueQrData: GlueQrInfo[] = [
  {
    qrText: 'GLUE_C2_R26216_LINE',
    glueName: 'C2 R26216 Keo bồi đế',
    workshop: 'BU2',
    workOrder: 'Chuyền 1 C2 R26216',
    shape: 'C2 R26216',
    productionLine: 'C2 R26216',
    returnWeight: '5 Kg',
  },
  {
    qrText: 'GLUE_C2_R26216_ALLOCATED',
    glueName: 'C2 R26216 Keo bồi đế',
    workshop: 'BU2',
    workOrder: 'Chuyền 1 C2 R26216',
    shape: 'C2 R26216',
    productionLine: 'C2 R26216',
    returnWeight: '5 Kg',
  },
  {
    qrText: 'GLUE_C2_R26216_RETURN',
    glueName: 'C2 R26216 Keo bồi đế',
    workshop: 'BU2',
    workOrder: 'Chuyền 1 C2 R26216',
    shape: 'C2 R26216',
    productionLine: 'C2 R26216',
    returnWeight: '5 Kg',
  },
  {
    qrText: 'GLUE_C2_R26216_OTHER_LINE',
    glueName: 'C2 R26216 Keo bồi đế',
    workshop: 'BU2',
    workOrder: 'Chuyền 2 C2 R26216',
    shape: 'C2 R26216',
    productionLine: 'C2 R26216-02',
    returnWeight: '4 Kg',
  },
  {
    qrText: 'GLUE_C3_R39558_RETURN',
    glueName: 'R39558 Keo bồi đế',
    workshop: 'BU3',
    workOrder: 'Chuyền 3 R39558',
    shape: 'R39558',
    productionLine: 'R39558-01',
    returnWeight: '3 Kg',
  },
];

export function normalizeGlueQrText(value: string) {
  return value.trim();
}

export function findMockGlueInfo(qrText: string) {
  const normalizedText = normalizeGlueQrText(qrText);
  const mockInfo = mockGlueQrData.find((item) => item.qrText === normalizedText);

  if (mockInfo) {
    return mockInfo;
  }

  return parseGlueQrPayload(normalizedText);
}

export function getGlueCompareKey(info: GlueQrInfo) {
  return [
    info.glueName,
    info.workshop,
    info.workOrder,
    info.shape,
    info.productionLine,
  ]
    .map((value) => value.trim().toLowerCase())
    .join('|');
}

export function getGlueInfoFields(info: GlueQrInfo): GlueInfoField[] {
  return [
    { label: 'Tên keo', value: info.glueName },
    { label: 'Xưởng', value: info.workshop },
    { label: 'Đơn điều công', value: info.workOrder },
    { label: 'Hình thể', value: info.shape },
    { label: 'Dây chuyền', value: info.productionLine },
    { label: 'Trọng lượng thu về', value: info.returnWeight },
  ];
}

function parseGlueQrPayload(qrText: string): GlueQrInfo | null {
  try {
    const payload = JSON.parse(qrText) as Partial<Record<string, unknown>>;

    const glueName = readTextValue(payload, 'glueName', 'tenKeo');
    const workshop = readTextValue(payload, 'workshop', 'xuong');
    const workOrder = readTextValue(payload, 'workOrder', 'donDieuCong');
    const shape = readTextValue(payload, 'shape', 'hinhThe');
    const productionLine = readTextValue(payload, 'productionLine', 'dayChuyen');
    const returnWeight = readTextValue(payload, 'returnWeight', 'trongLuongThuVe');

    if (!glueName || !workshop || !workOrder || !shape || !productionLine || !returnWeight) {
      return null;
    }

    return {
      qrText,
      glueName,
      workshop,
      workOrder,
      shape,
      productionLine,
      returnWeight,
    };
  } catch {
    return null;
  }
}

function readTextValue(payload: Partial<Record<string, unknown>>, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}
