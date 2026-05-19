import request from "@/services/apiService";

export default {
    postFactoryList(companyId: string) {
        return request.post(`api/mobile/factory/getlist`, { companyId: companyId })
    }
};