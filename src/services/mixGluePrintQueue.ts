/**
 * Parse hàng đợi in tem mix — tách khỏi mixGlueLabelPrint (TSPL)
 * để list page không kéo chunk in nặng khi chỉ cần build queue.
 */
export interface MixGluePrintItem {
  id: string;
  labelIndex: number;
  workOrderMasterId: string;
  mixGlueMasterId: string;
  workOrderMasterName?: string;
}

export function parsePrintQueueFromBe(
  scanData: any,
  respData: any,
  row: Partial<MixGluePrintItem>
): MixGluePrintItem[] {
  const data = scanData?.data;
  const fromBe = data?.items ?? data?.printList ?? data?.mixGlues;

  let rawItems: Array<{ workOrderMasterId: string; mixGlueMasterId: string; workOrderMasterName?: string }> = [];

  if (Array.isArray(fromBe) && fromBe.length > 0) {
    rawItems = fromBe
      .map((item: any) => ({
        workOrderMasterId: String(item.workOrderMasterId || row.workOrderMasterId || ''),
        mixGlueMasterId: String(item.mixGlueMasterId || ''),
        workOrderMasterName: item.workOrderMasterName || row.workOrderMasterName,
      }))
      .filter((item) => item.workOrderMasterId && item.mixGlueMasterId);
  } else {
    const ids = new Set<string>();
    if (respData?.mixGlueMasterId) ids.add(String(respData.mixGlueMasterId));
    (respData?.mixGlues || []).forEach((item: any) => {
      if (item.mixGlueMasterId) ids.add(String(item.mixGlueMasterId));
    });

    rawItems = [...ids].map((mixGlueMasterId) => ({
      workOrderMasterId: String(row.workOrderMasterId || respData?.workOrderMasterId || ''),
      mixGlueMasterId,
      workOrderMasterName: row.workOrderMasterName || respData?.workOrderMasterName,
    }));
  }

  return rawItems.map((item, index) => ({
    ...item,
    id: `${item.workOrderMasterId}-${item.mixGlueMasterId}`,
    labelIndex: index + 1,
  }));
}
