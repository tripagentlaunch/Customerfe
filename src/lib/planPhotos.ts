// One photo per slot (morning/afternoon/evening) — three slots a day means
// three photos a day, not three photos per slot.
const PHOTOS_PER_SLOT = 1;

export function planSlotPhotos(
  _citySlug: string,
  _dayIndex: number,
  _slotIndex: number,
  realPhoto?: string | null,
): string[] {
  if (realPhoto) return [realPhoto];
  return []; // no photo of the place: none, never a placeholder
}

export { PHOTOS_PER_SLOT };
