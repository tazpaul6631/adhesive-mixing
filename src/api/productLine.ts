import request, { SLOW_API_TIMEOUT } from "@/services/apiService";

export default {
    getBaseList(data: any) {
        return request.post(`api/mobile/productline/getbaselist`, data, { timeout: SLOW_API_TIMEOUT });
    },
};