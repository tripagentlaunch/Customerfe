import { placeholderPhoto } from "./placeholderPhoto";

// One photo per slot (morning/afternoon/evening) — three slots a day means
// three photos a day, not three photos per slot.
const PHOTOS_PER_SLOT = 1;

export function planSlotPhotos(citySlug: string, dayIndex: number, slotIndex: number): string[] {
  return Array.from({ length: PHOTOS_PER_SLOT }, (_, i) => placeholderPhoto(`${citySlug}-plan-${dayIndex}-${slotIndex}-${i}`));
}

export { PHOTOS_PER_SLOT };
