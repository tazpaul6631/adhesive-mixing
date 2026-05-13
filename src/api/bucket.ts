import request from "@/services/apiService";

export default {
    postBucket(data: any) {
        return request.post(`api/mobile/bucket/getbaselist`, data)
    }
};