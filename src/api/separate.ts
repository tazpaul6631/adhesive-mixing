import request from "@/services/apiService";

export default {
    postSeparateGlueCommand(data: any) {
        return request.post(`api/mobile/separateglue/command`, data)
    },
    postSGQueryResult(data: any) {
        return request.post(`api/mobile/separateglue/sgqueryresult`, data)
    },
    postNSGQueryResult(data: any) {
        return request.post(`api/mobile/separateglue/nsgqueryresult`, data)
    },
    postConfirmSG(data: any) {
        return request.post(`api/mobile/separateglue/confirmsg`, data)
    },
    postConfirmNSG(data: any) {
        return request.post(`api/mobile/separateglue/confirmnsg`, data)
    }
};
