import request from "@/services/apiService";

export default {
    getCheckListItem(factoryId: string, cliId: string) {
        return request.get(`api/mobile/checklist/getone/${factoryId}/${cliId}`)
    },
    createCheckList(data: any) {
        return request.post(`api/mobile/checklist/create`, data, { withRequestBy: true })
    },
    /** Load danh sách loại vấn đề — không truyền checkListAbnormalItemId. */
    getCheckList(factoryId: string, checkListItemId: string | number) {
        return request.post(`api/mobile/checklist/getclailist`, {
            factoryId,
            checkListItemId,
        })
    }
};
