import offlineApi from '@/api/offline';
import { useSQLite } from '@/composables/useSQLite';

type GlueOfflineDbConnection = {
  execute: (statements: string, transaction?: boolean, isSQL92?: boolean) => Promise<any>;
  run: (statement: string, values?: any[], transaction?: boolean, returnMode?: string) => Promise<any>;
};

export type GlueOfflineDataType =
  | 'lineChemical'
  | 'mixGlue'
  | 'separateGlue'
  | 'noSeparateGlue'
  | 'checkList';

export type GlueOfflineDownloadProgress = {
  current: number;
  total: number;
  type?: GlueOfflineDataType | 'save';
};

export type GlueOfflineDownloadCounts = Record<GlueOfflineDataType, number>;

type OfflineDataBucket = Record<GlueOfflineDataType, any[]>;

type OfflineTableConfig = {
  insertSql: string;
  getValues: (item: any) => any[];
};

const DOWNLOAD_TOTAL_STEPS = 6;

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
    getValues: (item) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.lineChemicalId),
      normalizeValue(item?.productLineId),
      normalizeValue(item?.chemicalMasterId),
      JSON.stringify(item ?? {}),
      new Date().toISOString(),
    ],
  },
  mixGlue: {
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
    getValues: (item) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.mixGlueMasterId),
      normalizeValue(item?.productLineId),
      normalizeValue(item?.glueId),
      JSON.stringify(item ?? {}),
      new Date().toISOString(),
    ],
  },
  separateGlue: {
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
    getValues: (item) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.separateGlueId),
      normalizeValue(item?.productLineId),
      normalizeValue(item?.glueId),
      JSON.stringify(item ?? {}),
      new Date().toISOString(),
    ],
  },
  noSeparateGlue: {
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
    getValues: (item) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.noSeparateGlueId),
      normalizeValue(item?.productLineId),
      normalizeValue(item?.materialCode),
      JSON.stringify(item ?? {}),
      new Date().toISOString(),
    ],
  },
  checkList: {
    insertSql: `
      INSERT OR REPLACE INTO offline_check_list (
        factory_id,
        check_list_item_id,
        raw_json,
        updated_at
      ) VALUES (?, ?, ?, ?)
    `,
    getValues: (item) => [
      normalizeValue(item?.factoryId),
      normalizeValue(item?.checkListItemId),
      JSON.stringify(item ?? {}),
      new Date().toISOString(),
    ],
  },
};

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
  `);
}

async function clearOfflineQrData(db: GlueOfflineDbConnection) {
  await db.execute(`
    DELETE FROM offline_line_chemical;
    DELETE FROM offline_mix_glue;
    DELETE FROM offline_separate_glue;
    DELETE FROM offline_no_separate_glue;
    DELETE FROM offline_check_list;
  `);
}

async function insertBucket(db: GlueOfflineDbConnection, type: GlueOfflineDataType, items: any[]) {
  const config = tableConfigs[type];

  for (const item of items) {
    await db.run(config.insertSql, config.getValues(item));
  }
}

async function replaceOfflineQrData(data: OfflineDataBucket) {
  const db = await getReadyDatabase();
  await createOfflineTables(db);
  await clearOfflineQrData(db);

  await insertBucket(db, 'lineChemical', data.lineChemical);
  await insertBucket(db, 'mixGlue', data.mixGlue);
  await insertBucket(db, 'separateGlue', data.separateGlue);
  await insertBucket(db, 'noSeparateGlue', data.noSeparateGlue);
  await insertBucket(db, 'checkList', data.checkList);
}

export async function downloadAndSaveGlueOfflineData(
  factoryId: string,
  onProgress?: (progress: GlueOfflineDownloadProgress) => void
): Promise<GlueOfflineDownloadCounts> {
  const normalizedFactoryId = normalizeValue(factoryId);

  if (!normalizedFactoryId) {
    throw new Error('Không tìm thấy mã nhà máy để tải dữ liệu offline.');
  }

  const data: OfflineDataBucket = {
    lineChemical: [],
    mixGlue: [],
    separateGlue: [],
    noSeparateGlue: [],
    checkList: [],
  };

  onProgress?.({ current: 0, total: DOWNLOAD_TOTAL_STEPS });

  data.lineChemical = assertSuccessAndExtractItems(await offlineApi.getLineChemicalQrData(normalizedFactoryId));
  onProgress?.({ current: 1, total: DOWNLOAD_TOTAL_STEPS, type: 'lineChemical' });

  data.mixGlue = assertSuccessAndExtractItems(await offlineApi.getMixGlueQrData(normalizedFactoryId));
  onProgress?.({ current: 2, total: DOWNLOAD_TOTAL_STEPS, type: 'mixGlue' });

  data.separateGlue = assertSuccessAndExtractItems(await offlineApi.getSeparateGlueQrData(normalizedFactoryId));
  onProgress?.({ current: 3, total: DOWNLOAD_TOTAL_STEPS, type: 'separateGlue' });

  data.noSeparateGlue = assertSuccessAndExtractItems(await offlineApi.getNoSeparateGlueQrData(normalizedFactoryId));
  onProgress?.({ current: 4, total: DOWNLOAD_TOTAL_STEPS, type: 'noSeparateGlue' });

  data.checkList = assertSuccessAndExtractItems(await offlineApi.getCheckListQrData(normalizedFactoryId));
  onProgress?.({ current: 5, total: DOWNLOAD_TOTAL_STEPS, type: 'checkList' });

  await replaceOfflineQrData(data);
  // console.log('Offline data saved:', {
  //   lineChemical: data.lineChemical.length,
  //   mixGlue: data.mixGlue.length,
  //   separateGlue: data.separateGlue.length,
  //   noSeparateGlue: data.noSeparateGlue.length,
  //   checkList: data.checkList.length,
  // });
  onProgress?.({ current: 6, total: DOWNLOAD_TOTAL_STEPS, type: 'save' });

  return {
    lineChemical: data.lineChemical.length,
    mixGlue: data.mixGlue.length,
    separateGlue: data.separateGlue.length,
    noSeparateGlue: data.noSeparateGlue.length,
    checkList: data.checkList.length,
  };
}

export async function ensureGlueOfflineTables() {
  const db = await getReadyDatabase();
  await createOfflineTables(db);
}

export default {
  downloadAndSaveGlueOfflineData,
  ensureGlueOfflineTables,
};
