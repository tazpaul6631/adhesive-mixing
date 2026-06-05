import { useSQLite } from '@/composables/useSQLite';

export type OfflineQueueType = 'ReceiveGlue' | 'ReturnGlue' | 'GlueCheckList';

export type OfflineQueueItem = {
  id: number;
  queueType: OfflineQueueType;
  endpoint: string;
  method: string;
  payload: any;
  status: string;
  retryCount: number;
  lastError: string;
  createdAt: string;
  updatedAt: string;
};

export type OfflineQueueCounts = Record<OfflineQueueType, number>;

type OfflineQueueDbConnection = {
  execute: (statements: string, transaction?: boolean, isSQL92?: boolean) => Promise<any>;
  run: (statement: string, values?: any[], transaction?: boolean, returnMode?: string) => Promise<any>;
  query: (statement: string, values?: any[], isSQL92?: boolean) => Promise<any>;
};

const queueTypes: OfflineQueueType[] = ['ReceiveGlue', 'ReturnGlue', 'GlueCheckList'];

function normalizeValue(value: any) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

async function getReadyDatabase(): Promise<OfflineQueueDbConnection> {
  const sqlite = useSQLite();
  await sqlite.initDatabase();

  const db = sqlite.getDbInstance();
  if (!db) {
    throw new Error('SQLite chưa sẵn sàng để lưu dữ liệu chờ đồng bộ.');
  }

  return db;
}

export async function ensureOfflineQueueTable() {
  const db = await getReadyDatabase();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_type TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);
}

export async function addOfflineQueueItem(
  queueType: OfflineQueueType,
  endpoint: string,
  method: string,
  payload: any
) {
  const db = await getReadyDatabase();
  await ensureOfflineQueueTable();

  const now = new Date().toISOString();

  await db.run(
    `
      INSERT INTO offline_queue (
        queue_type,
        endpoint,
        method,
        payload,
        status,
        retry_count,
        last_error,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'pending', 0, '', ?, ?)
    `,
    [queueType, endpoint, method, JSON.stringify(payload ?? {}), now, now]
  );
}

export async function countPendingQueueItems(queueType?: OfflineQueueType): Promise<number> {
  const db = await getReadyDatabase();
  await ensureOfflineQueueTable();

  const result = queueType
    ? await db.query(
      `SELECT COUNT(*) AS total FROM offline_queue WHERE status = 'pending' AND queue_type = ?`,
      [queueType]
    )
    : await db.query(`SELECT COUNT(*) AS total FROM offline_queue WHERE status = 'pending'`);

  return Number(result?.values?.[0]?.total ?? 0);
}

export async function getPendingQueueCounts(): Promise<OfflineQueueCounts> {
  const counts: OfflineQueueCounts = {
    ReceiveGlue: 0,
    ReturnGlue: 0,
    GlueCheckList: 0,
  };

  const db = await getReadyDatabase();
  await ensureOfflineQueueTable();

  const result = await db.query(`
    SELECT queue_type, COUNT(*) AS total
    FROM offline_queue
    WHERE status = 'pending'
    GROUP BY queue_type
  `);

  for (const row of result?.values ?? []) {
    const queueType = normalizeValue(row?.queue_type) as OfflineQueueType;

    if (queueTypes.includes(queueType)) {
      counts[queueType] = Number(row?.total ?? 0);
    }
  }

  return counts;
}

export async function listPendingQueueItems(queueType?: OfflineQueueType): Promise<OfflineQueueItem[]> {
  const db = await getReadyDatabase();
  await ensureOfflineQueueTable();

  const result = queueType
    ? await db.query(
      `
        SELECT *
        FROM offline_queue
        WHERE status = 'pending' AND queue_type = ?
        ORDER BY created_at ASC, id ASC
      `,
      [queueType]
    )
    : await db.query(`
        SELECT *
        FROM offline_queue
        WHERE status = 'pending'
        ORDER BY created_at ASC, id ASC
      `);

  return (result?.values ?? []).map((row: any) => {
    let payload: any = {};

    try {
      payload = JSON.parse(row?.payload ?? '{}');
    } catch {
      payload = {};
    }

    return {
      id: Number(row?.id ?? 0),
      queueType: normalizeValue(row?.queue_type) as OfflineQueueType,
      endpoint: normalizeValue(row?.endpoint),
      method: normalizeValue(row?.method),
      payload,
      status: normalizeValue(row?.status),
      retryCount: Number(row?.retry_count ?? 0),
      lastError: normalizeValue(row?.last_error),
      createdAt: normalizeValue(row?.created_at),
      updatedAt: normalizeValue(row?.updated_at),
    };
  });
}


export async function deleteOfflineQueueItems(ids: number[]) {
  const validIds = ids
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!validIds.length) {
    return;
  }

  const db = await getReadyDatabase();
  await ensureOfflineQueueTable();

  const placeholders = validIds.map(() => '?').join(', ');
  await db.run(`DELETE FROM offline_queue WHERE id IN (${placeholders})`, validIds);
}

export async function updateOfflineQueueItemsError(ids: number[], message: string) {
  const validIds = ids
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!validIds.length) {
    return;
  }

  const db = await getReadyDatabase();
  await ensureOfflineQueueTable();

  const placeholders = validIds.map(() => '?').join(', ');
  await db.run(
    `
      UPDATE offline_queue
      SET retry_count = retry_count + 1,
          last_error = ?,
          updated_at = ?
      WHERE id IN (${placeholders})
    `,
    [normalizeValue(message), new Date().toISOString(), ...validIds]
  );
}

export default {
  ensureOfflineQueueTable,
  addOfflineQueueItem,
  countPendingQueueItems,
  getPendingQueueCounts,
  listPendingQueueItems,
  deleteOfflineQueueItems,
  updateOfflineQueueItemsError,
};
