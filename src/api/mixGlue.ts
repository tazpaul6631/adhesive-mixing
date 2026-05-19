import request from "@/services/apiService";

export default {
    postMixGlueCommand(data: any) {
        return request.post(`api/mobile/mixglue/command`, data)
    },
    postMGMConfirmComplete(data: any) {
        return request.post(`api/mobile/mixglue/mgmconfirmcomplete`, data)
    },
    postMixGlueConfirm(data: any) {
        return request.post(`api/mobile/mixglue/mgmqipconfirm`, data)
    }
};