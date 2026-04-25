import request from "@/services/apiService";

export default {
    postUserValidate(data: any) {
        return request.post(`/user/validate`, data)
    }
};