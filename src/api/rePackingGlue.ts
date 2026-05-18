import request from "@/services/apiService";

export default {
    postRePackingGlueCommand(data: any) {
        return request.post(`api/mobile/repackingglue/command`, data)
    },

    getLineChemicalScanQr(factoryId: string, lineChemicalId: string, productLineId: string) {
        return request.get(
            `api/mobile/linechemical/scanqr/${factoryId}/${lineChemicalId}/${productLineId}`
        )
    }
};
