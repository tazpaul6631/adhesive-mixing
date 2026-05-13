import request from "@/services/apiService";

export default {
    postWorkOrderList(data: any) {
        return request.post(`api/mobile/workorder/queryresult`, data)
    },
    getWorkOrder(id: any, stepId: any) {
        return request.get(`api/mobile/workorder/getone/${id}/${stepId}`)
    }
};