'use client'

import { useEffect, useState, useMemo } from 'react';
import { fetchCones } from '../services/api';
import ToyCard from './ToyCard';
import { Card } from '@heroui/react';
import ConeSectionsManager from './ConeSectionsManager';

import type { ToySection, Toy as ConeEditorToy } from 'cone-editor/dist/toyMachine';

type Shapes = ConeEditorToy['topShape'];

interface ApiCone {
  id: number;
  name: string;
  brand: string;
  size: string;
  height: number;
  diameter: number;
  shape: {
    top_section_shape: string;
    bottom_section_shape: string;
    sections: ToySection[];
  };
}

export interface Toy {
  id: number;
  name: string;
  brand: string;
  size: string;
  height: number;
  diameter: number;
  topShape: Shapes;
  bottomShape: Shapes;
  sections: ToySection[];
}

const ConeList = () => {
  const [cones, setCones] = useState<Toy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChanged, setLastChanged] = useState(0);

  const maxHeight = 320;
  const scaleFactor = useMemo(() => {
    const maxToyHeight = Math.max(...cones.map(cone => cone.height), maxHeight);
    return maxHeight / maxToyHeight;
  }, [cones]);

  const updateLastChanged = () => setLastChanged(Date.now());

  useEffect(() => {
    const loadCones = async () => {
      try {
        const data = await fetchCones() as ApiCone[];
        const transformedCones: Toy[] = data.map(cone => ({
          ...cone,
          topShape: cone.shape.top_section_shape.toLowerCase() as Shapes,
          bottomShape: (cone.shape.bottom_section_shape || 'flat').toLowerCase() as Shapes,
          sections: cone.shape.sections.map(section => ({
            id: section.id,
            height: section.height,
            diameter: section.diameter
          }))
        }));
        setCones(transformedCones);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCones();
  }, [lastChanged]);

  if (isLoading) {
    return <div className="loading">Loading cones...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="pt-5 pb-5">
      <div className="flex flex-row flex-wrap gap-4 mx-4 items-end">
        {cones.map((cone) => (
          <ToyCard key={cone.id} toy={cone} scaleFactor={scaleFactor} updateLastChanged={updateLastChanged} />
        ))}
        <Card className="w-96 border-dashed border-4 border-gray-400 shadow-none bg-gray-200">
          <Card.Content className="h-[320px]">
            <div className="mb-2 flex items-center justify-center h-full">
              <ConeSectionsManager />
            </div>
          </Card.Content>
          <Card.Footer className="h-36" />
        </Card>
      </div>
    </div>
  );
};

export default ConeList;
