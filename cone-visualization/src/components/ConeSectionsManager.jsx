'use client'

import React, { useState } from 'react';
import ConeVisualization from './ToyRender';
import { saveCone } from '../services/api';
import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
} from "@material-tailwind/react";
import ConeControls from './ConeControls';


const TOP_SHAPES = {
  CONE: 'cone',
  EGG: 'egg'
};
const ConeSectionsManager = () => {
  const [sections, setSections] = useState([
    { id: 1, diameter: 100, height: 50, shape: TOP_SHAPES.CONE }
  ]);
  const [saveStatus, setSaveStatus] = useState('');
  const [coneName, setConeName] = useState('');
  const [open, setOpen] = React.useState(false);

  const addSection = () => {
    const newId = sections.length ? Math.max(...sections.map(s => s.id)) + 1 : 1;
    const lastSection = sections[sections.length - 1];
    setSections([...sections, {
      id: newId,
      diameter: lastSection.diameter * 0.8,
      height: 50,
      shape: TOP_SHAPES.CONE
    }]);
  };

  const removeSection = (id) => {
    setSections(sections.filter(section => section.id !== id));
  };

  const updateSection = (id, property, value) => {
    setSections(sections.map(section =>
      section.id === id ? {
        ...section,
        [property]: property === 'shape' ? value : Number(value)
      } : section
    ));
  };

  const moveSection = (index, direction) => {
    const newSections = [...sections];
    const newIndex = index + direction;

    if (newIndex >= 0 && newIndex < sections.length) {
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
      setSections(newSections);
    }
  };

  const handleOpen = () => setOpen(!open);

  const handleSaveCone = async () => {
    try {
      setSaveStatus('Saving...');
      await saveCone(coneName, sections);
      setSaveStatus('Saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveStatus(`Error saving: ${err.message}`);
    }
  };

  return (
    <div className="cone-section-manager">
      <Button onClick={handleOpen} variant="gradient">
        New Toy
      </Button>
      <Dialog open={open} handler={handleOpen} size="lg">
        <DialogHeader className="pb-0">Create new toy</DialogHeader>
        <DialogBody className='pt-0'>
          <div className="flex flex-wrap items-end">
            <div className="flex-1/2">
          <ConeVisualization sections={sections} scaleFactor={2}/>
          </div>
          <div className="flex-1/2">
          <ConeControls
            addSection={addSection}
            updateSection={updateSection}
            removeSection={removeSection}
            moveSection={moveSection}
            sections={sections}
            shapes={TOP_SHAPES}
          />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={coneName}
              onChange={(e) => setConeName(e.target.value)}
              placeholder="Enter cone name"
              className="cone-name-input"
            />
            <Button
              className="save-button"
              onClick={handleSaveCone}
              disabled={!coneName.trim()}
            >
              Save Cone
            </Button>
            {saveStatus && (
              <div className={`save-status ${saveStatus.includes('Error') ? 'error' : 'success'}`}>
                {saveStatus}
              </div>
            )}
          </div>
          </div>
        </DialogBody>
      </Dialog>
    </div>
  );
};

export default ConeSectionsManager;