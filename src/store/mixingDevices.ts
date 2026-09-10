import { defineStore } from 'pinia';
import storageService from '@/services/storage.service';

/** recordStatus: 1 = available, 2 = in use. deviceType: 1 = small, 2 = large. */
export type MixingDevice = {
  departmentMixingDeviceId: number | string;
  deviceType?: string | number;
  departmentMixingDeviceName: string;
  /** Runtime status (có thể đổi khi MixStart/Complete / sync WO). */
  recordStatus: string | number;
  /** Status từ login BE — baseline khi sync lại list WO. */
  loginRecordStatus: string;
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

/** Tên hiển thị hợp lệ — không dùng raw id. */
const isDisplayName = (name: unknown, deviceId: unknown): boolean => {
  const n = normalizeId(name);
  const id = normalizeId(deviceId);
  return !!n && n !== id;
};

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
  const status = normalizeStatus(raw?.recordStatus ?? raw?.RecordStatus);

  return {
    departmentMixingDeviceId,
    deviceType: raw?.deviceType ?? raw?.DeviceType,
    // Không fallback name = id (tránh chip hiện snowflake id).
    departmentMixingDeviceName: isDisplayName(name, departmentMixingDeviceId) ? name : '',
    recordStatus: status,
    loginRecordStatus: status,
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
    /** Persist tên máy theo id — còn dùng sau kill app / login lại. */
    nameById: {} as Record<string, string>,
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
        .filter((d): d is MixingDevice => !!d);

      // Merge tên vào map bền (không ghi đè bằng rỗng / id).
      for (const device of this.devices) {
        const id = normalizeId(device.departmentMixingDeviceId);
        const name = normalizeId(device.departmentMixingDeviceName);
        if (isDisplayName(name, id)) {
          this.nameById[id] = name;
        }
      }

      this.assignments = {};
    },

    clear() {
      this.devices = [];
      this.assignments = {};
      // Giữ nameById để re-login vẫn resolve được tên máy đã biết.
    },

    getDeviceById(deviceId: unknown): MixingDevice | null {
      if (isUnassignedDeviceId(deviceId)) return null;
      const id = normalizeId(deviceId);
      return this.devices.find((d) => normalizeId(d.departmentMixingDeviceId) === id) ?? null;
    },

    /** Chỉ trả tên hiển thị — không bao giờ trả raw id. */
    resolveDeviceDisplayName(deviceId: unknown): string {
      if (isUnassignedDeviceId(deviceId)) return '';
      const id = normalizeId(deviceId);
      const device = this.getDeviceById(id);
      const fromDevice = normalizeId(device?.departmentMixingDeviceName);
      if (isDisplayName(fromDevice, id)) return fromDevice;

      const fromMap = normalizeId(this.nameById[id]);
      if (isDisplayName(fromMap, id)) return fromMap;

      return '';
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

      const name = normalizeId(device.departmentMixingDeviceName);
      if (isDisplayName(name, id)) {
        this.nameById[id] = name;
      }
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
     * Rebuild usage:
     * - Baseline = recordStatus từ login BE (1/2)
     * - Overlay máy đang gắn trên WO list (≠ 0, chưa complete) → in use
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
        device.recordStatus = normalizeStatus(device.loginRecordStatus);
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
     * - Assigned (store or row id) → device name (không hiện id)
     * - Awaiting MixStart → next available device name
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
      if (this.devices.length === 0) {
        return '';
      }

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
        return this.resolveDeviceDisplayName(boundId);
      }

      if (row.mixStartComplete === false || row.mixStartComplete == null) {
        const deviceType = resolveRequiredDeviceType(row);
        const device = this.pickAvailableDevice(deviceType);
        if (!device) return '';
        return this.resolveDeviceDisplayName(device.departmentMixingDeviceId);
      }

      return '';
    },

    shouldShowBadge(row: {
      mixGlueConfirm?: boolean;
      mixGlueComplete?: boolean;
    }): boolean {
      if (this.devices.length === 0) return false;
      return row.mixGlueConfirm === true && row.mixGlueComplete !== true;
    },
  },

  persist: {
    key: 'mixing_devices_storage',
    storage: {
      getItem: async (key: string) => await storageService.get(key, false, true),
      setItem: async (key: string, value: string) => await storageService.set(key, value, true),
    } as any,
    pick: ['devices', 'assignments', 'nameById'],
  },
});
