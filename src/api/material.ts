import request from "@/services/apiService";

export default {
    postMaterial(data: any) {
        return request.post(`api/mobile/material/getbaselist`, data)
    }
};