import { getUserCountry } from './geolocation';

export interface AdConfig {
  country: string;
  adUrl: string;
  frequency: number; // Play ad every X station changes
  timeInterval: number; // Play ad every X minutes
  cooldownPeriod: number; // Minimum time between ads in ms
}

export interface AdAnalytics {
  totalAdsPlayed: number;
  adsByCountry: Record<string, number>;
  lastAdTimestamp: number;
  sessionStartTime: number;
}

const AD_STORAGE_KEY = 'desimelody_ad_analytics';
const AD_CONFIG_STORAGE_KEY = 'desimelody_ad_config';

// Default ad configuration
const DEFAULT_AD_CONFIG: Record<string, string> = {
  'AU': '/ads/australia.mp3',
  'IN': '/ads/india.mp3',
  'PK': '/ads/pakistan.mp3',
  'US': '/ads/usa.mp3',
  'default': '/ad.mp3'
};

export const AD_FREQUENCY = 5; // Every 5th station change
export const AD_TIME_INTERVAL = 15 * 60 * 1000; // 15 minutes
export const AD_COOLDOWN = 3 * 60 * 1000; // 3 minutes minimum between ads

/**
 * Get the appropriate ad URL based on user's detected country
 */
export const getAdUrlForRegion = async (): Promise<string> => {
  try {
    const country = await getUserCountry();
    return DEFAULT_AD_CONFIG[country] || DEFAULT_AD_CONFIG.default;
  } catch (error) {
    console.log('Error detecting country for ad:', error);
    return DEFAULT_AD_CONFIG.default;
  }
};

/**
 * Load ad analytics from localStorage
 */
export const loadAdAnalytics = (): AdAnalytics => {
  try {
    const stored = localStorage.getItem(AD_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading ad analytics:', error);
  }

  // Return default analytics
  return {
    totalAdsPlayed: 0,
    adsByCountry: {},
    lastAdTimestamp: 0,
    sessionStartTime: Date.now()
  };
};

/**
 * Save ad analytics to localStorage
 */
export const saveAdAnalytics = (analytics: AdAnalytics): void => {
  try {
    localStorage.setItem(AD_STORAGE_KEY, JSON.stringify(analytics));
  } catch (error) {
    console.error('Error saving ad analytics:', error);
  }
};

/**
 * Check if an ad should be played based on station change count
 */
export const shouldPlayAdOnStationChange = (
  stationChangeCount: number,
  lastAdTimestamp: number
): boolean => {
  // Check frequency condition (every 5th change)
  const frequencyMet = stationChangeCount > 0 && stationChangeCount % AD_FREQUENCY === 0;
  
  // Check cooldown period (minimum 3 minutes between ads)
  const timeSinceLastAd = Date.now() - lastAdTimestamp;
  const cooldownMet = timeSinceLastAd >= AD_COOLDOWN;

  return frequencyMet && cooldownMet;
};

/**
 * Check if an ad should be played based on time interval
 */
export const shouldPlayAdOnTimeInterval = (
  sessionStartTime: number,
  lastAdTimestamp: number
): boolean => {
  const now = Date.now();
  const sessionDuration = now - sessionStartTime;
  const timeSinceLastAd = now - lastAdTimestamp;

  // Play ad every 15 minutes if user has been listening
  return sessionDuration >= AD_TIME_INTERVAL && timeSinceLastAd >= AD_COOLDOWN;
};

/**
 * Log ad impression
 */
export const logAdImpression = async (analytics: AdAnalytics): Promise<AdAnalytics> => {
  const country = await getUserCountry().catch(() => 'unknown');
  
  const updatedAnalytics: AdAnalytics = {
    ...analytics,
    totalAdsPlayed: analytics.totalAdsPlayed + 1,
    adsByCountry: {
      ...analytics.adsByCountry,
      [country]: (analytics.adsByCountry[country] || 0) + 1
    },
    lastAdTimestamp: Date.now()
  };

  saveAdAnalytics(updatedAnalytics);
  return updatedAnalytics;
};

/**
 * Get ad analytics summary for display
 */
export const getAdAnalyticsSummary = (): {
  totalAds: number;
  topCountries: Array<{ country: string; count: number }>;
  sessionDuration: number;
} => {
  const analytics = loadAdAnalytics();
  
  const topCountries = Object.entries(analytics.adsByCountry)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const sessionDuration = Date.now() - analytics.sessionStartTime;

  return {
    totalAds: analytics.totalAdsPlayed,
    topCountries,
    sessionDuration
  };
};

/**
 * Reset ad analytics (useful for testing)
 */
export const resetAdAnalytics = (): void => {
  localStorage.removeItem(AD_STORAGE_KEY);
};
