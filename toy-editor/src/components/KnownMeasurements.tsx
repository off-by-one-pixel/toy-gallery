import { useToyStore } from '../toyMachine';
import { useEditorConfig } from './editorConfig';
import { useMmInput } from './editor/hooks/useMmInput';

const KnownMeasurements = () => {
  const { labels } = useEditorConfig();
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

  const knownCircumferenceMm = knownSize == null ? null : knownSize * Math.PI;
  const handleKnownCircumferenceChange = (mm: number | null) => {
    setKnownSize(mm == null ? null : mm / Math.PI);
  };

  return (
    <section className="toy-editor-known" aria-label={labels.knownMeasurements}>
      <h3 className="toy-editor-group-title">{labels.knownMeasurements}</h3>

      <div className="toy-editor-known-row">
        <NumberField label={labels.insertable} mm={insertable} onChangeMm={setInsertable} />
        <NumberField label={labels.total} mm={knownTotal} onChangeMm={setKnownTotal} />
        <NumberField
          label={labels.circumference}
          mm={knownCircumferenceMm}
          onChangeMm={handleKnownCircumferenceChange}
        />

        <label className="toy-editor-snap">
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
          {labels.snap}
        </label>
        <label className="toy-editor-snap">
          <input type="checkbox" checked={showSectionCirc} onChange={(e) => setShowSectionCirc(e.target.checked)} />
          {labels.sectionCircumferences}
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
  const { unit } = useEditorConfig();
  const input = useMmInput(mm, onChangeMm);

  return (
    <label className="toy-editor-known-field">
      <span className="toy-editor-known-field-label">{label}</span>
      <span className="toy-editor-known-field-input">
        <input {...input} />
        <span className="toy-editor-known-field-unit">{unit.id}</span>
      </span>
    </label>
  );
};

export default KnownMeasurements;
