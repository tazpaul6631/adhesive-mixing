import request from "@/services/apiService";

export default {
    employeeLogin(data: any) {
        return request.post(`api/mobile/employee/login`, data)
    },
    postValidateQIP(data: any) {
        return request.post(`api/mobile/employee/validateqip`, data)
    },
    postValidatePasswordQIP(data: any) {
        return request.post(`api/mobile/employee/validateqipbypassword`, data)
    }
};