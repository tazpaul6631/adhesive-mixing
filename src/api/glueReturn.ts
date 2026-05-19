import request from "@/services/apiService";

export default {
    glueReturn(data: any) {
        return request.post(`api/mobile/gluereturnlog/create`, data)
    }
};