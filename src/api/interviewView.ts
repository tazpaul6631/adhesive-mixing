import request from "@/services/apiService";

export default {
    getInterviewView(id: number) {
        return request.get(`/interviewview/getone`, id)
    },
    postInterviewView(data: any) {
        return request.post(`/interviewview/getlist`, data)
    }
};