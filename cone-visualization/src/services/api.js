export const fetchCones = async () => {
  const response = await fetch('http://127.0.0.1:8000/toys/toys/');
  if (!response.ok) {
    throw new Error('Failed to fetch cones');
  }
  return response.json();
};