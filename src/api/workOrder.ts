import request, { SLOW_API_TIMEOUT } from "@/services/apiService";

export default {
    // List WorkOrder query qua WorkOrderMasterView (nhiều JOIN + tính toán) → cần timeout dài
    postWorkOrderList(data: any) {
        return request.post(`api/mobile/workorder/queryresult`, data, { timeout: SLOW_API_TIMEOUT });
    },
    // getone step 1/3 cũng nặng: load OrderDetail + StyleChemical + MixGlue + SeparateGlue
    getWorkOrder(factoryId: any, id: any, stepId: any) {
        return request.get(`api/mobile/workorder/getone/${factoryId}/${id}/${stepId}`, undefined, { timeout: SLOW_API_TIMEOUT });
    }
};
