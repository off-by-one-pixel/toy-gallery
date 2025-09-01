'use client'

import React, { useState } from 'react';
import { saveCone } from '../services/api';
import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
} from "@material-tailwind/react";
import { ToyEditor } from 'cone-editor';


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
  const [toyBrand, setToyBrand] = useState('');
  const [toySize, setToySize] = useState('');
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(!open);
  const handleSaveCone = async () => {
    try {
      setSaveStatus('Saving...');
      await saveCone(toyBrand, coneName, toySize, sections);
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
            <ToyEditor/>
          <div className="flex-1">
            <input
              type="text"
              value={toyBrand}
              onChange={(e) => setToyBrand(e.target.value)}
              placeholder="Enter brand"
              className="cone-name-input"
            />
            <input
              type="text"
              value={coneName}
              onChange={(e) => setConeName(e.target.value)}
              placeholder="Enter name"
              className="cone-name-input"
            />
            <input
              type="text"
              value={toySize}
              onChange={(e) => setToySize(e.target.value)}
              placeholder="Enter size (e.g., Small, Medium, Large)"
              className="cone-name-input"
            />
            <Button
              className="save-button"
              onClick={handleSaveCone}
              disabled={!coneName.trim() || !toyBrand.trim() || sections.length === 0}
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