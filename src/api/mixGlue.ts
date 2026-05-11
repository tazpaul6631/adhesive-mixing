import request from "@/services/apiService";

export default {
    postMixGlueMasterCommand(data: any) {
        return request.post(`api/moblie/mixglue/mixgluemastercommand`, data)
    }
};