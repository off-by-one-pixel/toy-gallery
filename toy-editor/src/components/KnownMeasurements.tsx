import { useToyStore } from "../toyMachine";
import { useEditorUnit } from "./unit";

const KnownMeasurements = () => {
  const insertable = useToyStore((s) => s.insertableLengthMm);
  const knownTotal = useToyStore((s) => s.knownTotalMm);
  const knownSize = useToyStore((s) => s.knownSizeMm);
  const snap = useToyStore((s) => s.snapEnabled);
  const setInsertable = useToyStore((s) => s.setInsertableLength);
  const setKnownTotal = useToyStore((s) => s.setKnownTotal);
  const setKnownSize = useToyStore((s) => s.setKnownSize);
  const setCircumference = useToyStore((s) => s.setCircumference);
  const setSnap = useToyStore((s) => s.setSnapEnabled);

  // The Size field is always circumference. Internally `knownSize` is
  // stored as the canonical diameter (= circumference / π); display
  // converts back via π.
  const knownCircumferenceMm = knownSize == null ? null : knownSize * Math.PI;

  const handleKnownCircumferenceChange = (mm: number | null) => {
    if (mm == null) {
      setKnownSize(null);
      return;
    }
    setKnownSize(mm / Math.PI);
    // Mirror onto the section with the largest already-set circumference
    // (by circumference, not by diameter). If no section has a
    // circumference, don't propagate — the user hasn't claimed any
    // section has a measured value yet.
    const sections = useToyStore.getState().sections;
    let widestId: number | null = null;
    let widestCirc = -Infinity;
    for (const s of sections) {
      if (s.circumference != null && s.circumference > widestCirc) {
        widestCirc = s.circumference;
        widestId = s.id;
      }
    }
    if (widestId != null) {
      setCircumference(widestId, mm);
    }
  };

  return (
    <section className="cone-editor-known" aria-label="Known measurements">
      <h3 className="cone-editor-group-title">Known measurements</h3>

      <div className="cone-editor-known-row">
        <NumberField
          label="Insertable"
          mm={insertable}
          onChangeMm={setInsertable}
        />
        <NumberField
          label="Total"
          mm={knownTotal}
          onChangeMm={setKnownTotal}
        />
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
  const step = 10 ** -unit.decimals;
  const display = mm == null ? "" : (mm / unit.factor).toFixed(unit.decimals);

  return (
    <label className="cone-editor-known-field">
      <span className="cone-editor-known-field-label">{label}</span>
      <span className="cone-editor-known-field-input">
        <input
          type="number"
          value={display}
          step={step}
          min={0}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChangeMm(null);
              return;
            }
            const parsed = Number(raw);
            if (Number.isNaN(parsed)) return;
            onChangeMm(Math.max(0, parsed) * unit.factor);
          }}
        />
        <span className="cone-editor-known-field-unit">{unit.id}</span>
      </span>
    </label>
  );
};

export default KnownMeasurements;
