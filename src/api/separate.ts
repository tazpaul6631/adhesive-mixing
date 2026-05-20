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
    },
    getSGQueryResult(factoryId: any, sgId: any) {
        return request.get(`api/mobile/separateglue/getonesg/${factoryId}/${sgId}`)
    },
    getNSGQueryResult(factoryId: any, nsgId: any) {
        return request.get(`api/mobile/separateglue/getonensg/${factoryId}/${nsgId}`)
    },
    getLineChemicalScanQr(factoryId: string, lineChemicalId: string, productLineId: string) {
        return request.get(
            `api/mobile/linechemical/scanqr/${factoryId}/${lineChemicalId}/${productLineId}`
        )
    },
    getSeparateGlueScanQr(factoryId: string, sgId: string) {
        return request.get(
            `api/mobile/separateglue/scansgqr/${factoryId}/${sgId}`
        )
    },
    getNoSeparateGlueScanQr(factoryId: string, nsgId: string) {
        return request.get(
            `api/mobile/separateglue/scannsgqr/${factoryId}/${nsgId}`
        )
    }
};
