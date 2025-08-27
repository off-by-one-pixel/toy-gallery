'use client'

import { useEffect, useState } from 'react';
import { fetchCones } from '../services/api';
import ToyCard from './ToyCard';
import { Card, CardBody, CardFooter } from '@material-tailwind/react';
import ConeSectionsManager from "../components/ConeSectionsManager";

const ConeList = () => {
  const [cones, setCones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const maxHeight = 320;
  const maxToyHeight = Math.max(...cones.map(cone => cone.height), maxHeight);
  const scaleFactor = maxHeight / maxToyHeight;
  const [lastChanged, setLastChanged] = useState(0);

  const updateLastChanged = () => setLastChanged(Date.now());

  useEffect(() => {
    const loadCones = async () => {
      try {
        const data = await fetchCones();
        // Transform the API data to match our ConeVisualization component's format
        const transformedCones = data.map(cone => ({
          ...cone,
          topShape: cone.shape.top_section_shape.toLowerCase(),
          sections: cone.shape.sections.map(section => ({
            id: section.id,
            height: section.height,
            diameter: section.diameter
          }))
        }));
        setCones(transformedCones);
      } catch (err) {
        setError(err.message);
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
          <ToyCard key={cone.name} toy={cone} scaleFactor={scaleFactor} updateLastChanged={updateLastChanged} />
        ))}
        <Card className="w-96 bg-gray-200 border-dashed border-4 border-gray-400 shadow-none">
          <CardBody className="h-[320px]">
            <div className="mb-2 flex items-center justify-center h-full">
              <ConeSectionsManager />
            </div>
          </CardBody>
          <CardFooter className="h-36">
            </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ConeList;