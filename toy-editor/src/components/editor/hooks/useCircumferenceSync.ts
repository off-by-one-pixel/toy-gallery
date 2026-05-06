import { useCallback } from "react";
import { findLargestCircumferenceSection, largestCircumference } from "../../../util/sync";
import { useToyStore } from "../../../toyMachine";

export type CircumferenceSync = {
  /** Mirror a Known Circumference change onto the section with the
   *  largest already-set circumference. If no section has a
   *  circumference set, this is a no-op (the user hasn't claimed any
   *  section has a measured value yet). Caller is responsible for
   *  also storing the value as `knownSize` (= mm / π). */
  pushFromKnown: (mm: number) => void;
  /** Apply a section circumference change, then re-sync `knownSize`.
   *  Set: only updates Known if the new value is (or ties for) the new
   *  max. Cleared (v == null): always re-syncs Known to the next
   *  largest, or null when no section has a circumference left. */
  pushFromSection: (sectionId: number, v: number | null) => void;
};

/** Single source of truth for the bidirectional Known⇄section sync rules.
 *  Both the toy-level Known Circumference field and per-section
 *  Circumference inputs route through this hook. */
export const useCircumferenceSync = (): CircumferenceSync => {
  const setCircumference = useToyStore((s) => s.setCircumference);
  const setKnownSize = useToyStore((s) => s.setKnownSize);

  const pushFromKnown = useCallback(
    (mm: number) => {
      const widest = findLargestCircumferenceSection(useToyStore.getState().sections);
      if (widest != null) setCircumference(widest.id, mm);
    },
    [setCircumference],
  );

  const pushFromSection = useCallback(
    (sectionId: number, v: number | null) => {
      setCircumference(sectionId, v);
      const max = largestCircumference(useToyStore.getState().sections);
      if (v != null) {
        if (v >= (max ?? 0)) setKnownSize(v / Math.PI);
      } else {
        setKnownSize(max == null ? null : max / Math.PI);
      }
    },
    [setCircumference, setKnownSize],
  );

  return { pushFromKnown, pushFromSection };
};
