import request from "@/services/apiService";

export default {
    postMixGlueCommand(data: any) {
        return request.post(`api/mobile/mixglue/command`, data, { withRequestBy: true })
    },
    postMGMConfirmComplete(data: any) {
        return request.post(`api/mobile/mixglue/mgmconfirmcomplete`, data)
    },
    postMGMQIPConfirm(data: any) {
        return request.post(`api/mobile/mixglue/mgmqipconfirm`, data)
    },
    postPrintMixGlueLabel(data: any) {
        return request.post(`api/mobile/mixglue/printmixglue`, data)
    }
};
