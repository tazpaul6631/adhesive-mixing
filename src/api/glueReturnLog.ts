import request, { SLOW_API_TIMEOUT } from "@/services/apiService";

export default {
    // List query qua GlueReturnLogView (JOIN view + COUNT + SELECT = 2 lần) → cần timeout dài
    postListGlueReturnLog(data: any) {
        return request.post(`api/mobile/gluereturnlog/getqueryresult`, data, { timeout: SLOW_API_TIMEOUT });
    },
    postConfirmGlueReturnLog(data: any) {
        return request.post(`api/mobile/gluereturnlog/confirmgrl`, data);
    },
    getOneGlueReturnLog(factoryId: string, grlId: string, rgId: string) {
        return request.get(`api/mobile/gluereturnlog/getone/${factoryId}/${grlId}/${rgId}`);
    }
};
