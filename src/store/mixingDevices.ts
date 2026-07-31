import { defineStore } from 'pinia';
import storageService from '@/services/storage.service';

/** recordStatus: 1 = available, 2 = in use. deviceType: 1 = small, 2 = large. */
export type MixingDevice = {
  departmentMixingDeviceId: number | string;
  deviceType?: string | number;
  departmentMixingDeviceName: string;
  recordStatus: string | number;
};

export type MixingDeviceType = '1' | '2';

const RECORD_AVAILABLE = '1';
const RECORD_IN_USE = '2';
const DEVICE_TYPE_SMALL: MixingDeviceType = '1';
const DEVICE_TYPE_LARGE: MixingDeviceType = '2';

const normalizeId = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

/** BE dùng 0 / "0" = chưa gán máy. */
const isUnassignedDeviceId = (value: unknown): boolean => {
  const id = normalizeId(value);
  return !id || id === '0';
};

const normalizeStatus = (value: unknown): string => {
  const s = normalizeId(value);
  return s === RECORD_IN_USE ? RECORD_IN_USE : RECORD_AVAILABLE;
};

const normalizeDeviceType = (value: unknown): string => normalizeId(value);

export type DeviceUsageStats = {
  inUse: number;
  total: number;
  isFull: boolean;
};

const computeUsageForType = (
  devices: MixingDevice[],
  deviceType: MixingDeviceType
): DeviceUsageStats => {
  const type = normalizeDeviceType(deviceType);
  const pool = devices.filter((d) => normalizeDeviceType(d.deviceType) === type);
  const inUse = pool.filter((d) => normalizeStatus(d.recordStatus) === RECORD_IN_USE).length;
  const total = pool.length;
  return {
    inUse,
    total,
    isFull: total > 0 && inUse >= total,
  };
};

const normalizeDevice = (raw: any): MixingDevice | null => {
  const departmentMixingDeviceId = normalizeId(
    raw?.departmentMixingDeviceId ?? raw?.DepartmentMixingDeviceId
  );
  if (!departmentMixingDeviceId) return null;

  const name = normalizeId(
    raw?.departmentMixingDeviceName ?? raw?.DepartmentMixingDeviceName
  );

  return {
    departmentMixingDeviceId,
    deviceType: raw?.deviceType ?? raw?.DeviceType,
    departmentMixingDeviceName: name || departmentMixingDeviceId,
    recordStatus: normalizeStatus(raw?.recordStatus ?? raw?.RecordStatus),
  };
};

const parseIsProcessingAgent = (value: unknown): boolean =>
  value === true || value === 'true' || value === 1 || value === '1';

/**
 * type 1 (nhỏ): isProcessingAgent && floor(weight) < 3
 * type 2 (lớn): còn lại (agent false, hoặc weight >= 3)
 */
export function resolveRequiredDeviceType(row: {
  isProcessingAgent?: boolean | string | number | null;
  requestOrderWeight?: string | number | null;
}): MixingDeviceType {
  if (!parseIsProcessingAgent(row.isProcessingAgent)) {
    return DEVICE_TYPE_LARGE;
  }

  const weight = Math.floor(Number(row.requestOrderWeight));
  if (Number.isFinite(weight) && weight < 3) {
    return DEVICE_TYPE_SMALL;
  }

  return DEVICE_TYPE_LARGE;
}

export const useMixingDevicesStore = defineStore('mixingDevices', {
  state: () => ({
    devices: [] as MixingDevice[],
    /** workOrderMasterId → departmentMixingDeviceId */
    assignments: {} as Record<string, string>,
  }),

  getters: {
    availableDevices(state): MixingDevice[] {
      return state.devices.filter((d) => normalizeStatus(d.recordStatus) === RECORD_AVAILABLE);
    },
    smallDeviceUsage(state): DeviceUsageStats {
      return computeUsageForType(state.devices, DEVICE_TYPE_SMALL);
    },
    largeDeviceUsage(state): DeviceUsageStats {
      return computeUsageForType(state.devices, DEVICE_TYPE_LARGE);
    },
  },

  actions: {
    setFromLogin(rawList: unknown) {
      const list = Array.isArray(rawList) ? rawList : [];
      this.devices = list
        .map((item) => normalizeDevice(item))
        .filter((d): d is MixingDevice => !!d)
        // Usage/chip đếm theo WO list; login chỉ cung cấp pool máy.
        .map((device) => ({ ...device, recordStatus: RECORD_AVAILABLE }));
      this.assignments = {};
    },

    clear() {
      this.devices = [];
      this.assignments = {};
    },

    getDeviceById(deviceId: unknown): MixingDevice | null {
      if (isUnassignedDeviceId(deviceId)) return null;
      const id = normalizeId(deviceId);
      return this.devices.find((d) => normalizeId(d.departmentMixingDeviceId) === id) ?? null;
    },

    getAssignedDeviceId(workOrderMasterId: unknown): string {
      const woId = normalizeId(workOrderMasterId);
      if (!woId) return '';
      const id = this.assignments[woId] || '';
      return isUnassignedDeviceId(id) ? '' : id;
    },

    /** First available device of the required type (keeps login array order). */
    pickAvailableDevice(deviceType?: MixingDeviceType | string | number | null): MixingDevice | null {
      const requiredType = deviceType != null && normalizeDeviceType(deviceType)
        ? normalizeDeviceType(deviceType)
        : '';

      const pool = requiredType
        ? this.availableDevices.filter(
          (d) => normalizeDeviceType(d.deviceType) === requiredType
        )
        : this.availableDevices;

      return pool[0] ?? null;
    },

    markInUse(workOrderMasterId: unknown, deviceId: unknown) {
      const woId = normalizeId(workOrderMasterId);
      const id = normalizeId(deviceId);
      if (!woId || isUnassignedDeviceId(id)) return;

      // Chỉ gắn nếu id có trong pool login.
      const device = this.getDeviceById(id);
      if (!device) return;

      this.assignments[woId] = id;
      device.recordStatus = RECORD_IN_USE;
    },

    markFree(workOrderMasterId: unknown) {
      const woId = normalizeId(workOrderMasterId);
      if (!woId) return;

      const id = this.assignments[woId];
      if (id && !isUnassignedDeviceId(id)) {
        const device = this.getDeviceById(id);
        if (device) {
          device.recordStatus = RECORD_AVAILABLE;
        }
        delete this.assignments[woId];
      } else if (id) {
        delete this.assignments[woId];
      }
    },

    /**
     * Rebuild usage từ row WO:
     * - Reset toàn bộ máy về available
     * - Máy có departmentMixingDeviceId (≠ 0) khớp pool login → in use
     * - Bỏ qua đơn đã mixGlueComplete
     */
    syncAssignmentsFromRows(
      rows: Array<{
        workOrderMasterId?: string;
        departmentMixingDeviceId?: string | number | null;
        mixGlueConfirm?: boolean;
        mixGlueComplete?: boolean;
        mixStartComplete?: boolean;
      }>
    ) {
      this.assignments = {};
      for (const device of this.devices) {
        device.recordStatus = RECORD_AVAILABLE;
      }

      for (const row of rows) {
        const woId = normalizeId(row.workOrderMasterId);
        const deviceId = normalizeId(row.departmentMixingDeviceId);
        if (!woId || isUnassignedDeviceId(deviceId)) continue;
        if (row.mixGlueComplete === true) continue;

        // Chỉ đếm khi id khớp mixingDevices lúc login.
        if (!this.getDeviceById(deviceId)) continue;

        this.markInUse(woId, deviceId);
      }
    },

    /**
     * Badge label for a row.
     * - Assigned (store or row id) → that device name
     * - Awaiting MixStart → next available device of required deviceType
     */
    resolveBadgeName(row: {
      workOrderMasterId?: string;
      departmentMixingDeviceId?: string | number | null;
      mixGlueConfirm?: boolean;
      mixGlueComplete?: boolean;
      mixStartComplete?: boolean;
      isProcessingAgent?: boolean | string | number | null;
      requestOrderWeight?: string | number | null;
    }): string {
      if (row.mixGlueConfirm !== true || row.mixGlueComplete === true) {
        return '';
      }

      const woId = normalizeId(row.workOrderMasterId);
      const fromAssignment = woId ? this.getAssignedDeviceId(woId) : '';
      const fromRow = isUnassignedDeviceId(row.departmentMixingDeviceId)
        ? ''
        : normalizeId(row.departmentMixingDeviceId);
      const boundId = fromAssignment || fromRow;

      if (boundId) {
        const device = this.getDeviceById(boundId);
        return device?.departmentMixingDeviceName || boundId;
      }

      if (row.mixStartComplete === false || row.mixStartComplete == null) {
        const deviceType = resolveRequiredDeviceType(row);
        return this.pickAvailableDevice(deviceType)?.departmentMixingDeviceName || '';
      }

      return '';
    },

    shouldShowBadge(row: {
      mixGlueConfirm?: boolean;
      mixGlueComplete?: boolean;
    }): boolean {
      return row.mixGlueConfirm === true && row.mixGlueComplete !== true;
    },
  },

  persist: {
    key: 'mixing_devices_storage',
    storage: {
      getItem: async (key: string) => await storageService.get(key, false, true),
      setItem: async (key: string, value: string) => await storageService.set(key, value, true),
    } as any,
    pick: ['devices', 'assignments'],
  },
});
