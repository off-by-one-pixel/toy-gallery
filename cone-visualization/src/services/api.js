export const fetchCones = async () => {
  const response = await fetch('http://localhost:8000/toys/toys/');
  if (!response.ok) {
    throw new Error('Failed to fetch cones');
  }
  return response.json();
};

export const saveCone = async (coneName, coneSections) => {
  const transformedData = {
    name: coneName,
    shape: {
      sections: coneSections.map(section => ({
        order: section.id,
        height: parseFloat(section.height),
        diameter: parseFloat(section.diameter)
      })),
      top_section_shape: coneSections[0].shape.toUpperCase()
    }
  };

  const response = await fetch('http://localhost:8000/toys/toys/', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`max:max`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transformedData)
  });

  if (!response.ok) {
    throw new Error(`Failed to save cone: ${response.statusText}`);
  }

  return await response.json();
};