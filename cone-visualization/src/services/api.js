export const fetchCones = async () => {
  const response = await fetch('http://localhost:8000/toys/toys/');
  if (!response.ok) {
    throw new Error('Failed to fetch cones');
  }
  return response.json();
};