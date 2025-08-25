'use client'

import React, { useEffect, useState } from 'react';
import { fetchCones } from '../services/api';
import ToyCard from './ToyCard';

const ConeList = () => {
  const [cones, setCones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCones = async () => {
      try {
        const data = await fetchCones();
        // Transform the API data to match our ConeVisualization component's format
        const transformedCones = data.map(cone => ({
          ...cone,
          sections: cone.shape.sections.map(section => ({
            id: section.order,
            height: section.height,
            diameter: section.diameter,
            shape: section.order === 0 ? cone.shape.top_section_shape.toLowerCase() : 'cone'
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
  }, []);

  if (isLoading) {
    return <div className="loading">Loading cones...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="cone-list">
      <h1>Cone List</h1>
      <div className="flex flex-row flex-wrap gap-4 mx-4 items-end">
        {cones.map((cone) => (
          <ToyCard key={cone.name} toy={cone}/>
        ))}
      </div>
    </div>
  );
};

export default ConeList;