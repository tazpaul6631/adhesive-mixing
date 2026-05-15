import request from "@/services/apiService";

export default {
    postRePackingGlueCommand(data: any) {
        return request.post(`api/mobile/repackingglue/command`, data)
    },
    postRPGQueryResult(data: any) {
        return request.post(`api/mobile/repackingglue/rpgqueryresult`, data)
    },
    postNRPGQueryResult(data: any) {
        return request.post(`api/mobile/repackingglue/nrpgqueryresult`, data)
    },
    postConfirmRPG(data: any) {
        return request.post(`api/mobile/repackingglue/confirmrpg`, data)
    },
    postConfirmNRPG(data: any) {
        return request.post(`api/mobile/repackingglue/confirmnrpg`, data)
    },
    getRPGQueryResult(factoryId: any, rpgIdStr: any, rdIdStr: any) {
        return request.get(`api/mobile/repackingglue/getonerpg/${factoryId}/${rpgIdStr}/${rdIdStr}`)
    },
    getNRPGQueryResult(factoryId: any, nrpgIdStr: any, womIdStr: any,) {
        return request.get(`api/mobile/repackingglue/getonenrpg/${factoryId}/${nrpgIdStr}/${womIdStr}`)
    }
};