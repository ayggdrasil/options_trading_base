// Function to calculate rate change between two values
export const getRateChange = (oldValue: number, newValue: number): number => {
  if (oldValue == 0) return 0;
  return Math.abs((newValue - oldValue) / oldValue);
};

// Function to calculate percentage change between two values
export const getPercentageChange = (oldValue: number, newValue: number): number => {
  return getRateChange(oldValue, newValue) * 100;
};

export const getMedian = (values) => {
  if (values.length === 0) return 0;

  // sort without mutation
  const sorted = [...values].sort((a, b) => a - b);

  const half = Math.floor(sorted.length / 2);

  // even
  if (sorted.length % 2 == 0) {
    return (sorted[half - 1] + sorted[half]) / 2;
  }

  // odd
  return sorted[half];
};
