import { describe, expect, it } from 'vitest';
import {
  filterChietBucketOptionsForRow,
  getChietUncoveredRemainderGrams,
  isChietBucketSelectionComplete,
  needsMoreChietBuckets,
  shouldBlockChietAddRow,
  sumSelectedBucketCapacityKg,
  type BucketOption,
  validateChietBucketCapacity,
} from '@/views/Tablet/Separate/separateGlue.bucket';

const bucketList: BucketOption[] = [
  { bucketId: 1, capacity: 0.5, capacityUnit: 'Kg', label: '0.5 Kg' },
  { bucketId: 2, capacity: 1, capacityUnit: 'Kg', label: '1 Kg' },
  { bucketId: 3, capacity: 2, capacityUnit: 'Kg', label: '2 Kg' },
  { bucketId: 4, capacity: 3, capacityUnit: 'Kg', label: '3 Kg' },
];

const totalForRows = (rows: { selectedBucketId: number }[]) =>
  sumSelectedBucketCapacityKg(rows, bucketList);

describe('separateGlue.bucket remainder 50g rule', () => {
  it('computes uncovered remainder in grams', () => {
    expect(getChietUncoveredRemainderGrams(2.51, 2.5)).toBe(10);
    expect(getChietUncoveredRemainderGrams(2.55, 2.5)).toBe(50);
    expect(getChietUncoveredRemainderGrams(2.51, 2.51)).toBe(0);
  });

  it('2.510 + 2.00+0.50: remainder 10g → complete, submit OK', () => {
    const rows = [{ selectedBucketId: 3 }, { selectedBucketId: 1 }];
    expect(totalForRows(rows)).toBe(2.5);
    expect(isChietBucketSelectionComplete(2.51, 2.5)).toBe(true);
    expect(validateChietBucketCapacity(rows, bucketList, 2.51, 'Kg').ok).toBe(true);
    expect(shouldBlockChietAddRow(rows, bucketList, 2.51, 'Kg')).toBe(true);
  });

  it('2.510 + 2.00 only: remainder 510g → must add more', () => {
    const rows = [{ selectedBucketId: 3 }];
    expect(needsMoreChietBuckets(2.51, 2)).toBe(true);
    expect(validateChietBucketCapacity(rows, bucketList, 2.51, 'Kg').ok).toBe(false);
    expect(shouldBlockChietAddRow(rows, bucketList, 2.51, 'Kg')).toBe(false);
  });

  it('2.550 + 2.00+0.50: remainder 50g → must add more', () => {
    const rows = [{ selectedBucketId: 3 }, { selectedBucketId: 1 }];
    expect(isChietBucketSelectionComplete(2.55, 2.5)).toBe(false);
    expect(validateChietBucketCapacity(rows, bucketList, 2.55, 'Kg').ok).toBe(false);
    expect(shouldBlockChietAddRow(rows, bucketList, 2.55, 'Kg')).toBe(false);
  });

  it('2.550 + 2.00+0.50+0.50: total >= actual → complete', () => {
    const rows = [
      { selectedBucketId: 3 },
      { selectedBucketId: 1 },
      { selectedBucketId: 1 },
    ];
    expect(totalForRows(rows)).toBe(3);
    expect(isChietBucketSelectionComplete(2.55, 3)).toBe(true);
    expect(validateChietBucketCapacity(rows, bucketList, 2.55, 'Kg').ok).toBe(true);
  });

  it('2.010 + 2.00: remainder 10g → complete', () => {
    const rows = [{ selectedBucketId: 3 }];
    expect(validateChietBucketCapacity(rows, bucketList, 2.01, 'Kg').ok).toBe(true);
  });

  it('total >= actual is complete even if over by bucket step', () => {
    const rows = [{ selectedBucketId: 4 }];
    expect(validateChietBucketCapacity(rows, bucketList, 2.51, 'Kg').ok).toBe(true);
  });

  it('shows 0.5 after 2.00 when 2.510 still needs more', () => {
    const options = filterChietBucketOptionsForRow(
      bucketList,
      2.51,
      [{ selectedBucketId: 3 }],
      { selectedBucketId: null }
    );
    const caps = options.map((item) => Number(item.capacity));
    expect(caps).toContain(0.5);
  });
});
