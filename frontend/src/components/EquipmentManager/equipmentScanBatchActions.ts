import type { EquipmentItem } from '../../hooks/useEquipmentAPI';

type EquipmentBatchApi = {
  approveItem: (profileId: number, itemId: number, overrides?: {
    name?: string;
    category?: string;
    resistanceType?: string;
  }) => Promise<{ success: boolean; item: EquipmentItem }>;
  rejectItem: (profileId: number, itemId: number) => Promise<{ success: boolean; message: string }>;
};

export async function approveSelectedScanItems({
  api,
  profileId,
  items,
}: {
  api: EquipmentBatchApi;
  profileId: number;
  items: EquipmentItem[];
}): Promise<{ approvedItems: EquipmentItem[]; failedCount: number }> {
  const results = await Promise.allSettled(items.map(async (item) => {
    const scan = item.aiScanData;
    const response = await api.approveItem(profileId, item.id, {
      name: scan?.suggestedName || item.name,
      category: scan?.suggestedCategory || item.category,
      resistanceType: item.resistanceType || undefined,
    });
    return response.item;
  }));

  const approvedItems: EquipmentItem[] = [];
  let failedCount = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') approvedItems.push(result.value);
    else failedCount += 1;
  }
  return { approvedItems, failedCount };
}

export async function rejectSelectedScanItems({
  api,
  profileId,
  items,
}: {
  api: EquipmentBatchApi;
  profileId: number;
  items: EquipmentItem[];
}): Promise<{ rejectedIds: Set<number>; failedCount: number }> {
  const results = await Promise.allSettled(items.map(async (item) => {
    await api.rejectItem(profileId, item.id);
    return item.id;
  }));

  const rejectedIds = new Set<number>();
  let failedCount = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') rejectedIds.add(result.value);
    else failedCount += 1;
  }
  return { rejectedIds, failedCount };
}