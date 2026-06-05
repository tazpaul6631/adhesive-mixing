import request from '@/services/apiService';

export default {
  getLineChemicalQrData(factoryId: string) {
    return request.get(`api/mobile/offline/lcqrdata/${encodeURIComponent(factoryId)}`);
  },

  getMixGlueQrData(factoryId: string) {
    return request.get(`api/mobile/offline/mgmqrdata/${encodeURIComponent(factoryId)}`);
  },

  getSeparateGlueQrData(factoryId: string) {
    return request.get(`api/mobile/offline/sgqrdata/${encodeURIComponent(factoryId)}`);
  },

  getNoSeparateGlueQrData(factoryId: string) {
    return request.get(`api/mobile/offline/nsgqrdata/${encodeURIComponent(factoryId)}`);
  },

  getCheckListQrData(factoryId: string) {
    return request.get(`api/mobile/offline/cliqrdata/${encodeURIComponent(factoryId)}`);
  },
};
