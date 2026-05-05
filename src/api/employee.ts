import request from "@/services/apiService";

export default {
    employeeLogin(data: any) {
        return request.post(`mobile/employee/login`, data)
    }
};