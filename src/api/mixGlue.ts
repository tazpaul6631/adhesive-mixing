import request from "@/services/apiService";

export default {
    postMixGlueCommand(data: any) {
        return request.post(`api/mobile/mixglue/command`, data, { withRequestBy: true })
    },
    postMGMConfirmComplete(data: any) {
        return request.post(`api/mobile/mixglue/mgmconfirmcomplete`, data, { withRequestBy: true })
    },
    postMGMQIPConfirm(data: any) {
        return request.post(`api/mobile/mixglue/mgmqipconfirm`, data, { withRequestBy: true })
    },
    postPrintMixGlueLabel(data: any) {
        return request.post(`api/mobile/mixglue/printmixglue`, data)
    }
};
