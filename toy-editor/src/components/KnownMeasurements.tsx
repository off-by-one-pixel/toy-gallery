import { useState } from "react";
import { formatMm, parseMm } from "../util/fmt";
import { useToyStore } from "../toyMachine";
import { useEditorUnit } from "./unit";

const KnownMeasurements = () => {
  const insertable = useToyStore((s) => s.insertableLengthMm);
  const knownTotal = useToyStore((s) => s.knownTotalMm);
  const knownSize = useToyStore((s) => s.knownSizeMm);
  const snap = useToyStore((s) => s.snapEnabled);
  const showSectionCirc = useToyStore((s) => s.showSectionCircumference);
  const setInsertable = useToyStore((s) => s.setInsertableLength);
  const setKnownTotal = useToyStore((s) => s.setKnownTotal);
  const setKnownSize = useToyStore((s) => s.setKnownSize);
  const setSnap = useToyStore((s) => s.setSnapEnabled);
  const setShowSectionCirc = useToyStore((s) => s.setShowSectionCircumference);

  // The Size field is always circumference. Internally `knownSize` is
  // stored as the canonical diameter (= circumference / π); display
  // converts back via π.
  const knownCircumferenceMm = knownSize == null ? null : knownSize * Math.PI;
  const handleKnownCircumferenceChange = (mm: number | null) => {
    setKnownSize(mm == null ? null : mm / Math.PI);
  };

  return (
    <section className="cone-editor-known" aria-label="Known measurements">
      <h3 className="cone-editor-group-title">Known measurements</h3>

      <div className="cone-editor-known-row">
        <NumberField label="Insertable" mm={insertable} onChangeMm={setInsertable} />
        <NumberField label="Total" mm={knownTotal} onChangeMm={setKnownTotal} />
        <NumberField
          label="Circumference"
          mm={knownCircumferenceMm}
          onChangeMm={handleKnownCircumferenceChange}
        />

        <label className="cone-editor-snap">
          <input
            type="checkbox"
            checked={snap}
            onChange={(e) => setSnap(e.target.checked)}
          />
          Snap
        </label>
        <label className="cone-editor-snap">
          <input
            type="checkbox"
            checked={showSectionCirc}
            onChange={(e) => setShowSectionCirc(e.target.checked)}
          />
          Section circumferences
        </label>
      </div>
    </section>
  );
};

type NumberFieldProps = {
  label: string;
  mm: number | null;
  onChangeMm: (mm: number | null) => void;
};

const NumberField = ({ label, mm, onChangeMm }: NumberFieldProps) => {
  const unit = useEditorUnit();
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? formatMm(mm, unit);

  return (
    <label className="cone-editor-known-field">
      <span className="cone-editor-known-field-label">{label}</span>
      <span className="cone-editor-known-field-input">
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const parsed = parseMm(raw, unit);
            if (parsed === undefined) return;
            onChangeMm(parsed);
          }}
          onBlur={() => setDraft(null)}
        />
        <span className="cone-editor-known-field-unit">{unit.id}</span>
      </span>
    </label>
  );
};

export default KnownMeasurements;
