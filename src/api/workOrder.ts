import request from "@/services/apiService";

export default {
    postWorkOrderList(data: any) {
        return request.post(`api/mobile/workorder/getlist`, data)
    },
    getWorkOrder(id: any) {
        return request.get(`api/mobile/workorder/getone/${id}`)
    }
};