import type { capSQLiteSet } from '@capacitor-community/sqlite';
import offlineApi from '@/api/offline';
import { useSQLite } from '@/composables/useSQLite';

type GlueOfflineDbConnection = {
  execute: (statements: string, transaction?: boolean, isSQL92?: boolean) => Promise<any>;
  run: (statement: string, values?: any[], transaction?: boolean, returnMode?: string) => Promise<any>;
  query: (statement: string, values?: any[], isSQL92?: boolean) => Promise<any>;
  executeSet: (
    set: capSQLiteSet[],
    transaction?: boolean,
    returnMode?: string,
    isSQL92?: boolean
  ) => Promise<any>;
};

export type GlueOfflineDataType =
  | 'lineChemical'
  | 'layoutLineChemical'
  | 'mixGlue'
  | 'separateGlue'
  | 'noSeparateGlue'
  | 'checkList'
  | 'checkListAbnormal';

export type GlueOfflineQrResult = {
  data: any | null;
  status: 'success' | 'invalid' | 'noData';
  type?: GlueOfflineDataType;
};

export type GlueOfflineDownloadProgress = {
  current: number;
  total: number;
  type?: GlueOfflineDataType;
};

export type GlueOfflineDownloadCounts = Record<GlueOfflineDataType, number>;

type OfflineTableConfig = {
  tableName: string;
  insertSql: string;
  getValues: (item: any, updatedAt: string) => any[];
};

const DOWNLOAD_TOTAL_STEPS = 7;
/** Số record / lần executeSet — cân bằng tốc độ bridge và RAM máy yếu. */
const INSERT_CHUNK_SIZE = 200;

function normalizeValue(value: any) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function getResponseItems(responseData: any) {
  const payload = responseData?.data ?? responseData ?? [];

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

function assertSuccessAndExtractItems(response: any) {
  const responseData = response?.data;

  if (responseData?.success === false) {
    throw new Error(responseData?.message || 'Không thể tải dữ liệu offline.');
  }

  return getResponseItems(responseData);
}

const tableConfigs: Record<GlueOfflineDataType, OfflineTableConfig> = {
  lineChemical: {
    tableName: 'offline_line_chemical',
    insertSql: `
      INSERT OR REPLACE INTO offline_line_chemical (
        factory_id,
        line_chemical_id,
        product_line_id,
        chemical_master_id,
        raw_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    getValues: (item, updatedAt) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.lineChemicalId),
      normalizeValue(item?.productLineId),
      normalizeValue(item?.chemicalMasterId),
      JSON.stringify(item ?? {}),
      updatedAt,
    ],
  },
  layoutLineChemical: {
    tableName: 'offline_layout_line_chemical',
    insertSql: `
      INSERT OR REPLACE INTO offline_layout_line_chemical (
        factory_id,
        layout_line_chemical_id,
        chemical_master_id,
        raw_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
    getValues: (item, updatedAt) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.layoutLineChemicalId),
      normalizeValue(item?.chemicalMasterId),
      JSON.stringify(item ?? {}),
      updatedAt,
    ],
  },
  mixGlue: {
    tableName: 'offline_mix_glue',
    insertSql: `
      INSERT OR REPLACE INTO offline_mix_glue (
        factory_id,
        mix_glue_master_id,
        product_line_id,
        glue_id,
        raw_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    getValues: (item, updatedAt) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.mixGlueMasterId),
      normalizeValue(item?.productLineId),
      normalizeValue(item?.glueId),
      JSON.stringify(item ?? {}),
      updatedAt,
    ],
  },
  separateGlue: {
    tableName: 'offline_separate_glue',
    insertSql: `
      INSERT OR REPLACE INTO offline_separate_glue (
        factory_id,
        separate_glue_id,
        product_line_id,
        glue_id,
        raw_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    getValues: (item, updatedAt) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.separateGlueId),
      normalizeValue(item?.productLineId),
      normalizeValue(item?.glueId),
      JSON.stringify(item ?? {}),
      updatedAt,
    ],
  },
  noSeparateGlue: {
    tableName: 'offline_no_separate_glue',
    insertSql: `
      INSERT OR REPLACE INTO offline_no_separate_glue (
        factory_id,
        no_separate_glue_id,
        product_line_id,
        material_code,
        raw_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    getValues: (item, updatedAt) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.noSeparateGlueId),
      normalizeValue(item?.productLineId),
      normalizeValue(item?.materialCode),
      JSON.stringify(item ?? {}),
      updatedAt,
    ],
  },
  checkList: {
    tableName: 'offline_check_list',
    insertSql: `
      INSERT OR REPLACE INTO offline_check_list (
        factory_id,
        check_list_item_id,
        raw_json,
        updated_at
      ) VALUES (?, ?, ?, ?)
    `,
    getValues: (item, updatedAt) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.checkListItemId),
      JSON.stringify(item ?? {}),
      updatedAt,
    ],
  },
  checkListAbnormal: {
    tableName: 'offline_check_list_abnormal',
    insertSql: `
      INSERT OR REPLACE INTO offline_check_list_abnormal (
        factory_id,
        check_list_abnormal_item_id,
        check_list_item_id,
        raw_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
    getValues: (item, updatedAt) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.checkListAbnormalItemId),
      normalizeValue(item?.checkListItemId),
      JSON.stringify(item ?? {}),
      updatedAt,
    ],
  },
};

type OfflineQrLookupConfig = {
  type: GlueOfflineDataType;
  tableName: string;
  idColumn: string;
};

const qrLookupConfigs: Record<string, OfflineQrLookupConfig> = {
  lc: {
    type: 'lineChemical',
    tableName: 'offline_line_chemical',
    idColumn: 'line_chemical_id',
  },
  llc: {
    type: 'layoutLineChemical',
    tableName: 'offline_layout_line_chemical',
    idColumn: 'layout_line_chemical_id',
  },
  mgm: {
    type: 'mixGlue',
    tableName: 'offline_mix_glue',
    idColumn: 'mix_glue_master_id',
  },
  sg: {
    type: 'separateGlue',
    tableName: 'offline_separate_glue',
    idColumn: 'separate_glue_id',
  },
  nsg: {
    type: 'noSeparateGlue',
    tableName: 'offline_no_separate_glue',
    idColumn: 'no_separate_glue_id',
  },
  ngs: {
    type: 'noSeparateGlue',
    tableName: 'offline_no_separate_glue',
    idColumn: 'no_separate_glue_id',
  },
};

type ParsedGlueQr = {
  qrCode: string;
  factoryId: string;
  itemId: string;
};

function parseGlueQrText(qrText: string): ParsedGlueQr | null {
  const normalizedQrText = normalizeValue(qrText);

  if (!normalizedQrText) {
    return null;
  }

  let pathText = normalizedQrText;

  try {
    pathText = new URL(normalizedQrText).pathname;
  } catch {
    pathText = normalizedQrText;
  }

  const parts = pathText
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  const scanPathIndex = parts.findIndex((part) => part.toLowerCase() === 's');
  const startIndex = scanPathIndex >= 0 ? scanPathIndex + 1 : 0;
  const qrCode = normalizeValue(parts[startIndex]).toLowerCase();
  const factoryId = normalizeValue(parts[startIndex + 1]);
  const itemId = normalizeValue(parts[startIndex + 2]);

  if (!qrCode || !factoryId || !itemId) {
    return null;
  }

  return { qrCode, factoryId, itemId };
}

async function findRawJsonByQrConfig(
  db: GlueOfflineDbConnection,
  config: OfflineQrLookupConfig,
  factoryId: string,
  itemId: string
) {
  const result = await db.query(
    `SELECT raw_json FROM ${config.tableName} WHERE factory_id = ? AND ${config.idColumn} = ? LIMIT 1`,
    [factoryId, itemId]
  );

  const rawJson = result?.values?.[0]?.raw_json;

  if (!rawJson) {
    return null;
  }

  try {
    return JSON.parse(rawJson);
  } catch (error) {
    console.error('Không thể đọc dữ liệu QR offline:', error);
    return null;
  }
}

async function getReadyDatabase(): Promise<GlueOfflineDbConnection> {
  const sqlite = useSQLite();
  await sqlite.initDatabase();

  const db = sqlite.getDbInstance();
  if (!db) {
    throw new Error('SQLite chưa sẵn sàng để lưu dữ liệu offline.');
  }

  return db;
}

async function createOfflineTables(db: GlueOfflineDbConnection) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS offline_line_chemical (
      factory_id TEXT NOT NULL,
      line_chemical_id TEXT NOT NULL,
      product_line_id TEXT,
      chemical_master_id TEXT,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (factory_id, line_chemical_id)
    );

    CREATE TABLE IF NOT EXISTS offline_layout_line_chemical (
      factory_id TEXT NOT NULL,
      layout_line_chemical_id TEXT NOT NULL,
      chemical_master_id TEXT,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (factory_id, layout_line_chemical_id)
    );

    CREATE TABLE IF NOT EXISTS offline_mix_glue (
      factory_id TEXT NOT NULL,
      mix_glue_master_id TEXT NOT NULL,
      product_line_id TEXT,
      glue_id TEXT,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (factory_id, mix_glue_master_id)
    );

    CREATE TABLE IF NOT EXISTS offline_separate_glue (
      factory_id TEXT NOT NULL,
      separate_glue_id TEXT NOT NULL,
      product_line_id TEXT,
      glue_id TEXT,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (factory_id, separate_glue_id)
    );

    CREATE TABLE IF NOT EXISTS offline_no_separate_glue (
      factory_id TEXT NOT NULL,
      no_separate_glue_id TEXT NOT NULL,
      product_line_id TEXT,
      material_code TEXT,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (factory_id, no_separate_glue_id)
    );

    CREATE TABLE IF NOT EXISTS offline_check_list (
      factory_id TEXT NOT NULL,
      check_list_item_id TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (factory_id, check_list_item_id)
    );

    CREATE TABLE IF NOT EXISTS offline_check_list_abnormal (
      factory_id TEXT NOT NULL,
      check_list_abnormal_item_id TEXT NOT NULL,
      check_list_item_id TEXT,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (factory_id, check_list_abnormal_item_id)
    );
  `);
}

async function clearBucket(db: GlueOfflineDbConnection, type: GlueOfflineDataType) {
  const config = tableConfigs[type];
  await db.execute(`DELETE FROM ${config.tableName};`, false);
}

async function insertBucket(db: GlueOfflineDbConnection, type: GlueOfflineDataType, items: any[]) {
  if (items.length === 0) return;

  const config = tableConfigs[type];
  const updatedAt = new Date().toISOString();

  for (let offset = 0; offset < items.length; offset += INSERT_CHUNK_SIZE) {
    const chunk = items.slice(offset, offset + INSERT_CHUNK_SIZE);
    const set: capSQLiteSet[] = chunk.map((item) => ({
      statement: config.insertSql,
      values: config.getValues(item, updatedAt),
    }));
    // Một transaction / chunk — giảm số lần bridge call so với db.run từng dòng.
    await db.executeSet(set, true);
  }
}

async function saveDownloadedBucket(
  db: GlueOfflineDbConnection,
  type: GlueOfflineDataType,
  items: any[]
) {
  await clearBucket(db, type);
  await insertBucket(db, type, items);
}

async function clearAllOfflineBuckets(db: GlueOfflineDbConnection) {
  await clearBucket(db, 'lineChemical');
  await clearBucket(db, 'layoutLineChemical');
  await clearBucket(db, 'mixGlue');
  await clearBucket(db, 'separateGlue');
  await clearBucket(db, 'noSeparateGlue');
  await clearBucket(db, 'checkList');
  await clearBucket(db, 'checkListAbnormal');
}

async function downloadAndSaveBucket(
  db: GlueOfflineDbConnection,
  type: GlueOfflineDataType,
  fetchItems: () => Promise<any[]>,
  step: number,
  onProgress?: (progress: GlueOfflineDownloadProgress) => void
): Promise<number> {
  const items = await fetchItems();
  const count = items.length;

  try {
    await saveDownloadedBucket(db, type, items);
  } finally {
    // Nhả reference sớm để GC trên máy RAM thấp.
    items.length = 0;
  }

  onProgress?.({ current: step, total: DOWNLOAD_TOTAL_STEPS, type });
  return count;
}

export async function downloadAndSaveGlueOfflineData(
  factoryId: string,
  departmentId: string,
  onProgress?: (progress: GlueOfflineDownloadProgress) => void
): Promise<GlueOfflineDownloadCounts> {
  const normalizedFactoryId = normalizeValue(factoryId);
  const normalizedDepartmentId = normalizeValue(departmentId);

  if (!normalizedFactoryId) {
    throw new Error('Không tìm thấy mã nhà máy để tải dữ liệu offline.');
  }

  if (!normalizedDepartmentId) {
    throw new Error('Không tìm thấy mã bộ phận để tải dữ liệu offline.');
  }

  const db = await getReadyDatabase();
  await createOfflineTables(db);

  onProgress?.({ current: 0, total: DOWNLOAD_TOTAL_STEPS });

  // Tuần tự từng API: tải → lưu → nhả memory (tránh Promise.all làm đỉnh RAM trên máy 4GB).
  const lineChemical = await downloadAndSaveBucket(
    db,
    'lineChemical',
    async () => assertSuccessAndExtractItems(await offlineApi.getLineChemicalQrData(normalizedFactoryId)),
    1,
    onProgress
  );

  const layoutLineChemical = await downloadAndSaveBucket(
    db,
    'layoutLineChemical',
    async () =>
      assertSuccessAndExtractItems(
        await offlineApi.getLineLayoutChemicalQrData(normalizedFactoryId, normalizedDepartmentId)
      ),
    2,
    onProgress
  );

  const mixGlue = await downloadAndSaveBucket(
    db,
    'mixGlue',
    async () =>
      assertSuccessAndExtractItems(
        await offlineApi.getMixGlueQrData(normalizedFactoryId, normalizedDepartmentId)
      ),
    3,
    onProgress
  );

  const separateGlue = await downloadAndSaveBucket(
    db,
    'separateGlue',
    async () =>
      assertSuccessAndExtractItems(
        await offlineApi.getSeparateGlueQrData(normalizedFactoryId, normalizedDepartmentId)
      ),
    4,
    onProgress
  );

  const noSeparateGlue = await downloadAndSaveBucket(
    db,
    'noSeparateGlue',
    async () =>
      assertSuccessAndExtractItems(
        await offlineApi.getNoSeparateGlueQrData(normalizedFactoryId, normalizedDepartmentId)
      ),
    5,
    onProgress
  );

  const checkList = await downloadAndSaveBucket(
    db,
    'checkList',
    async () => assertSuccessAndExtractItems(await offlineApi.getCheckListQrData(normalizedFactoryId)),
    6,
    onProgress
  );

  const checkListAbnormal = await downloadAndSaveBucket(
    db,
    'checkListAbnormal',
    async () =>
      assertSuccessAndExtractItems(await offlineApi.getCheckListAbnormalItemQrData(normalizedFactoryId)),
    7,
    onProgress
  );

  return {
    lineChemical,
    layoutLineChemical,
    mixGlue,
    separateGlue,
    noSeparateGlue,
    checkList,
    checkListAbnormal,
  };
}

export async function clearGlueOfflineData() {
  const db = await getReadyDatabase();
  await createOfflineTables(db);
  await clearAllOfflineBuckets(db);
}

export async function findGlueOfflineQrData(qrText: string): Promise<GlueOfflineQrResult> {
  const parsedQr = parseGlueQrText(qrText);

  if (!parsedQr) {
    return { data: null, status: 'invalid' };
  }

  const config = qrLookupConfigs[parsedQr.qrCode];

  if (!config) {
    return { data: null, status: 'invalid' };
  }

  const db = await getReadyDatabase();
  await createOfflineTables(db);

  const data = await findRawJsonByQrConfig(db, config, parsedQr.factoryId, parsedQr.itemId);

  if (!data) {
    return { data: null, status: 'noData', type: config.type };
  }

  return { data, status: 'success', type: config.type };
}


export async function findCheckListOfflineData(
  factoryId: string,
  checkListItemId: string
): Promise<GlueOfflineQrResult> {
  const normalizedFactoryId = normalizeValue(factoryId);
  const normalizedCheckListItemId = normalizeValue(checkListItemId);

  if (!normalizedFactoryId || !normalizedCheckListItemId) {
    return { data: null, status: 'invalid', type: 'checkList' };
  }

  const db = await getReadyDatabase();
  await createOfflineTables(db);

  const data = await findRawJsonByQrConfig(
    db,
    {
      type: 'checkList',
      tableName: 'offline_check_list',
      idColumn: 'check_list_item_id',
    },
    normalizedFactoryId,
    normalizedCheckListItemId
  );

  if (!data) {
    return { data: null, status: 'noData', type: 'checkList' };
  }

  return { data, status: 'success', type: 'checkList' };
}

export async function findCheckListAbnormalOfflineData(
  factoryId: string,
  checkListItemId: string | number
): Promise<{ data: any[]; status: 'success' | 'invalid' | 'noData' }> {
  const normalizedFactoryId = normalizeValue(factoryId);
  const normalizedCheckListItemId = normalizeValue(checkListItemId);

  if (!normalizedFactoryId || !normalizedCheckListItemId) {
    return { data: [], status: 'invalid' };
  }

  const db = await getReadyDatabase();
  await createOfflineTables(db);

  const result = await db.query(
    `SELECT raw_json FROM offline_check_list_abnormal
     WHERE factory_id = ? AND check_list_item_id = ?`,
    [normalizedFactoryId, normalizedCheckListItemId]
  );

  const rows = Array.isArray(result?.values) ? result.values : [];
  const items: any[] = [];

  for (const row of rows) {
    const rawJson = row?.raw_json;
    if (!rawJson) continue;

    try {
      items.push(JSON.parse(rawJson));
    } catch (error) {
      console.error('Không thể đọc dữ liệu bất thường offline:', error);
    }
  }

  if (items.length === 0) {
    return { data: [], status: 'noData' };
  }

  return { data: items, status: 'success' };
}
