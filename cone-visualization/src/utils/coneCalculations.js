function calculateVolume(diameter, height) {
  const radius = diameter / 2;
  return (1 / 3) * Math.PI * Math.pow(radius, 2) * height;
}

function calculateSurfaceArea(diameter, height) {
  const radius = diameter / 2;
  const slantHeight = Math.sqrt(Math.pow(radius, 2) + Math.pow(height, 2));
  const baseArea = Math.PI * Math.pow(radius, 2);
  const lateralArea = Math.PI * radius * slantHeight;
  return baseArea + lateralArea;
}

export { calculateVolume, calculateSurfaceArea };