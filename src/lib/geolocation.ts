export const getUserCountry = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const country = data.country_code?.toUpperCase();
    
    // Map countries to ad regions (folder names)
    if (country === 'IN') return 'india';
    if (country === 'US') return 'usa';
    if (country === 'AU') return 'australia';
    if (country === 'PK') return 'pakistan';
    if (country === 'GB') return 'uk';
    if (country === 'AE') return 'uae';
    if (country === 'CA') return 'canada';
    if (country === 'BD') return 'bangladesh';
    if (country === 'KW') return 'kuwait';
    if (country === 'ZA') return 'south-africa';
    
    // Default to India for other South Asian countries
    if (['LK', 'NP', 'BT', 'MV'].includes(country)) return 'india';
    
    // Default to USA for all other countries
    return 'usa';
  } catch (error) {
    console.error('Error detecting location:', error);
    return 'india'; // Default fallback
  }
};

export const getAdUrl = (country: string): string => {
  return `/ads/${country}.mp3`;
};
