import request from "@/services/apiService";

export default {
    postRePackingGlueCommand(data: any) {
        return request.post(`api/mobile/repackingglue/command`, data)
    }
};