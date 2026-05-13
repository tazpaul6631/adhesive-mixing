import request from "@/services/apiService";

export default {
    postMixGlueCommand(data: any) {
        return request.post(`api/mobile/mixglue/command`, data)
    },
    postMixGlueConfirm(data: any) {
        return request.post(`api/mobile/mixglue/confirm`, data)
    }
};