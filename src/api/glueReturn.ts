import request from "@/services/apiService";

export default {
    glueReturnConfirm(data: any) {
        return request.post(`api/mobile/gluereturnlog/confirmgr`, data)
    },
    glueReturn(data: any) {
        return request.post(`api/mobile/gluereturnlog/create`, data)
    }
};