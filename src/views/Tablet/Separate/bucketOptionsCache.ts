import bucketApi from '@/api/bucket';
import { mapBucketOptions, type BucketOption } from '@/views/Tablet/Separate/separateGlue.bucket';

/** Cache danh sách thùng theo factory — Select ghi cache; Complete chỉ đọc, không gọi API. */
let cacheFactoryId = '';
let cache: BucketOption[] = [];
let inflight: Promise<BucketOption[]> | null = null;

export const getCachedBucketOptions = (factoryId: string): BucketOption[] => {
  if (factoryId && factoryId === cacheFactoryId && cache.length > 0) {
    return cache;
  }
  return [];
};

/**
 * @param force true = luôn gọi API (mở Select). false = chỉ trả cache / fetch khi chưa có (không dùng cho Complete).
 */
export const ensureBucketOptions = async (
  factoryId: string,
  options?: { force?: boolean }
): Promise<BucketOption[]> => {
  if (!factoryId) return [];

  if (!options?.force) {
    const hit = getCachedBucketOptions(factoryId);
    if (hit.length > 0) return hit;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data } = await bucketApi.postBucket({ factoryId });
      if (data?.success && data.data) {
        cache = mapBucketOptions(data.data);
        cacheFactoryId = factoryId;
      } else if (factoryId !== cacheFactoryId) {
        cache = [];
        cacheFactoryId = factoryId;
      }
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

export const clearBucketOptionsCache = () => {
  cache = [];
  cacheFactoryId = '';
  inflight = null;
};
