export const getUserCountry = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const country = data.country_code?.toUpperCase();
    
    // Map countries to ad regions
    if (country === 'IN') return 'india';
    if (country === 'US') return 'usa';
    if (country === 'AU') return 'australia';
    if (country === 'PK') return 'pakistan';
    
    // Default to India for South Asian countries
    if (['BD', 'LK', 'NP', 'BT', 'MV'].includes(country)) return 'india';
    
    // Default to India for unrecognized locations
    return 'india';
  } catch (error) {
    console.error('Error detecting location:', error);
    return 'india'; // Default fallback
  }
};

export const getAdUrl = (country: string): string => {
  return `/ads/${country}.mp3`;
};
