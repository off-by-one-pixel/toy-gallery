import React from 'react';

export interface ConeEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
}

const ConeEditor: React.FC<ConeEditorProps> = ({ 
  initialValue = '', 
  onChange 
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <div className="cone-editor">
      <textarea
        value={initialValue}
        onChange={handleChange}
        className="cone-editor__textarea"
      />
    </div>
  );
};

export default ConeEditor;
