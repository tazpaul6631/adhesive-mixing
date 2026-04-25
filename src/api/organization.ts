import request from "@/services/apiService";

export default {
    postOrganization(data: any) {
        return request.post(`/organization/getbaselist`, data)
    }
};