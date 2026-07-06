import request from '@/services/apiService';

export default {
  getLineChemicalQrData(factoryId: string) {
    return request.get(`api/mobile/offline/lcqrdata/${encodeURIComponent(factoryId)}`);
  },

  getMixGlueQrData(factoryId: string, departmentId: string) {
    return request.get(
      `api/mobile/offline/mgmqrdata/${encodeURIComponent(factoryId)}/${encodeURIComponent(departmentId)}`
    );
  },

  getSeparateGlueQrData(factoryId: string, departmentId: string) {
    return request.get(
      `api/mobile/offline/sgqrdata/${encodeURIComponent(factoryId)}/${encodeURIComponent(departmentId)}`
    );
  },

  getNoSeparateGlueQrData(factoryId: string, departmentId: string) {
    return request.get(
      `api/mobile/offline/nsgqrdata/${encodeURIComponent(factoryId)}/${encodeURIComponent(departmentId)}`
    );
  },

  getCheckListQrData(factoryId: string) {
    return request.get(`api/mobile/offline/cliqrdata/${encodeURIComponent(factoryId)}`);
  },
};
