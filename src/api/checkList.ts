import request from "@/services/apiService";

export default {
    getCheckListItem(factoryId: string, cliId: string) {
        return request.get(`api/mobile/checklist/getone/${factoryId}/${cliId}`)
    },
    createCheckList(data: any) {
        return request.post(`api/mobile/checklist/create`, data)
    }
};
