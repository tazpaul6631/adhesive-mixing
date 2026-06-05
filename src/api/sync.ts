import request from '@/services/apiService';

const syncApi = {
  syncReceiveGlue(data: any[]) {
    return request.post('api/mobile/sync/receiveglue', data);
  },

  syncGlueReturn(data: any[]) {
    return request.post('api/mobile/sync/gluereturn', data);
  },

  syncCheckListResult(data: any[]) {
    return request.post('api/mobile/sync/checklistresult', data);
  },
};

export default syncApi;
