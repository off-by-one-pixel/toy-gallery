'use client'

import { useState } from 'react';
import { saveCone } from '../services/api';
import { Button, Modal, Input, useOverlayState } from "@heroui/react";
import { ToyEditor } from 'cone-editor';
import type { Toy, ToySection, StyleOption } from 'cone-editor/dist/toyMachine';

const TOP_SHAPES = {
  CONE: 'cone',
  EGG: 'egg'
} as const;

const editorStyle: StyleOption = {
  borderWidth: 2,
  borderColor: "black",
  color: "lightblue",
};

const ConeSectionsManager = () => {
  const [sections, setSections] = useState<ToySection[]>([
    { id: 1, diameter: 100, height: 50 }
  ]);
  const [saveStatus, setSaveStatus] = useState('');
  const [coneName, setConeName] = useState('');
  const [toyBrand, setToyBrand] = useState('');
  const [toySize, setToySize] = useState('');
  const [topShape, setTopShape] = useState('');
  const state = useOverlayState({ defaultOpen: false });

  const handleSaveCone = async () => {
    try {
      setSaveStatus('Saving...');
      await saveCone(toyBrand, coneName, toySize, sections, topShape);
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveStatus(`Error saving: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div>
      <Button onPress={state.open} variant="primary">
        New Toy
      </Button>
      <Modal isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>Create new toy</Modal.Header>
              <Modal.Body>
                <div className="flex flex-wrap items-end">
                  <ToyEditor style={editorStyle} onChange={(toy: Toy) => { setSections(toy.sections); setTopShape(toy.topShape); }} />
                  <div className="flex-1 space-y-3">
                    <Input
                      type="text"
                      value={toyBrand}
                      onChange={(e) => setToyBrand(e.target.value)}
                      placeholder="Enter brand"
                      aria-label="Brand"
                    />
                    <Input
                      type="text"
                      value={coneName}
                      onChange={(e) => setConeName(e.target.value)}
                      placeholder="Enter name"
                      aria-label="Name"
                    />
                    <Input
                      type="text"
                      value={toySize}
                      onChange={(e) => setToySize(e.target.value)}
                      placeholder="Enter size (e.g., Small, Medium, Large)"
                      aria-label="Size"
                    />
                    <Button
                      onPress={handleSaveCone}
                      isDisabled={!coneName.trim() || !toyBrand.trim() || sections.length === 0}
                      fullWidth
                    >
                      Save Cone
                    </Button>
                    {saveStatus && (
                      <div className={saveStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}>
                        {saveStatus}
                      </div>
                    )}
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
};

export default ConeSectionsManager;
