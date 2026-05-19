import request from "@/services/apiService";

export default {
    postCompanyList() {
        return request.post(`api/mobile/company/getlist`, {})
    }
};