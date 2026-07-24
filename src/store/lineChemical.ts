import { defineStore } from 'pinia';

export interface LineChemicalSessionData {
  lineChemicalId?: string | number | null;
  productLineId?: string | number | null;
  factoryId?: string | number | null;
  productLineName?: string | null;
  glueName?: string | null;
  confirmedAt?: string | number | null;
}

export const useLineChemicalStore = defineStore('lineChemicalSession', {
  state: () => ({
    lineChemicalId: null as string | null,
    productLineId: null as string | number | null,
    factoryId: null as string | number | null,
    productLineName: null as string | null,
    glueName: null as string | null,
    confirmedAt: null as string | number | null,
  }),

  actions: {
    setLineChemicalSession(data: LineChemicalSessionData) {
      this.lineChemicalId = data.lineChemicalId !== null && data.lineChemicalId !== undefined
        ? String(data.lineChemicalId).trim()
        : null;
      this.productLineId = data.productLineId ?? null;
      this.factoryId = data.factoryId ?? null;
      this.productLineName = data.productLineName ?? null;
      this.glueName = data.glueName ?? null;
      this.confirmedAt = data.confirmedAt ?? null;
    },
  },
});
