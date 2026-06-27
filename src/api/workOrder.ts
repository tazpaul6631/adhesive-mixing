import request from "@/services/apiService";

export default {
    postWorkOrderList(data: any) {
        return request.post(`api/mobile/workorder/queryresult`, data)
    },
    getWorkOrder(factoryId: any, id: any, stepId: any) {
        return request.get(`api/mobile/workorder/getone/${factoryId}/${id}/${stepId}`)
    },
    postConfirmNoSeparate(data: any) {
        return request.post(`api/mobile/workorder/confirmnoseparate`, data)
    }
};