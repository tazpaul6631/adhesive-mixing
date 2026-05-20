import request from "@/services/apiService";

export default {
    postMixGlueCommand(data: any) {
        return request.post(`api/mobile/mixglue/command`, data)
    },
    postMGMConfirmComplete(data: any) {
        return request.post(`api/mobile/mixglue/mgmconfirmcomplete`, data)
    },
    postMGMQIPConfirm(data: any) {
        return request.post(`api/mobile/mixglue/mgmqipconfirm`, data)
    },
    getMixGlueScanQr(factoryId: string, mgmId: string, womId: string) {
        return request.get(`api/mobile/mixglue/scanqr/${factoryId}/${mgmId}/${womId}`)
    }
};