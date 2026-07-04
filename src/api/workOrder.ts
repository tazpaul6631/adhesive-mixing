import request, { SLOW_API_TIMEOUT } from "@/services/apiService";

export default {
    postWorkOrderList(data: any) {
        return request.post(`api/mobile/workorder/queryresult`, data, { timeout: SLOW_API_TIMEOUT });
    },
    getWorkOrder(factoryId: any, id: any, stepId: any) {
        return request.get(`api/mobile/workorder/getone/${factoryId}/${id}/${stepId}`, undefined, { timeout: SLOW_API_TIMEOUT });
    },
    postConfirmNoSeparate(data: any) {
        return request.post(`api/mobile/workorder/confirmnoseparate`, data)
    }
};
