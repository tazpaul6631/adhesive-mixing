import request from "@/services/apiService";

export default {
    getInterview() {
        return request.get(`/interview/getblankinterview`, {})
    },
    postCreateInterview(data: any) {
        return request.post(`/interview/create`, data)
    }
};