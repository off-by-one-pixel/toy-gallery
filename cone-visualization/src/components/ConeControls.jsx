import {
  Button,
  Slider,
  IconButton
} from "@material-tailwind/react";



const ConeControls = ({ addSection, updateSection, removeSection, moveSection, sections, shapes }) => {
  const MIN_DIAMETER = 10;
  const MAX_DIAMETER = 200;
  const MIN_HEIGHT = 10;
  const MAX_HEIGHT = 200;

  return (
    <div className="flex-1/2">
      <div>
        {sections.map((section, index) => (
          <div key={section.id} className="flex border p-2 m-2 rounded-2xl">
            <div>
              {index === 0 && (
                <select
                  value={section.shape}
                  onChange={(e) => updateSection(section.id, 'shape', e.target.value)}
                >
                  <option value={shapes.CONE}>Cone</option>
                  <option value={shapes.EGG}>Egg</option>
                </select>
              )}
              <div className="flex flex-wrap gap-1 p-1">
                <IconButton size="sm" className="w-full text-xs" color="white" variant="gradient" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                  ↑
                </IconButton>
                <IconButton size="sm" className="w-full text-xs" color="white" variant="gradient" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1}>
                  ↓
                </IconButton>
                <IconButton size="sm" className="text-xs" color="red" onClick={() => removeSection(section.id)}
                >
                  X
                </IconButton>
              </div>
            </div>
            <div className="flex flex-col flex-1 p-4">
              <label className="flex-1">
                Diameter: <span className="value">{Math.round(section.diameter)} mm</span>
                <Slider size="sm" value={(section.diameter - MIN_DIAMETER) / ((MAX_DIAMETER - MIN_DIAMETER) / 100)} onChange={(e) => updateSection(section.id, 'diameter', (MAX_DIAMETER - MIN_DIAMETER) / 100 * (e.target.value) + MIN_DIAMETER)} />
              </label>
              <label>
                Height: <span className="value">{Math.round(section.height)} mm</span>
                <Slider
                  size="sm"
                  value={(section.height - MIN_HEIGHT) / ((MAX_HEIGHT - MIN_HEIGHT) / 100)}
                  onChange={(e) => updateSection(section.id, 'height', (MAX_HEIGHT - MIN_HEIGHT) / 100 * (e.target.value) + MIN_HEIGHT)}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={addSection}>Add New Section</Button>
    </div>
  );
};

export default ConeControls;