import { getUserCountry } from "./geolocation";

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

const AD_STORAGE_KEY = "desimelody_ad_analytics";
const AD_CONFIG_STORAGE_KEY = "desimelody_ad_config";

// Default ad configuration
const DEFAULT_AD_CONFIG: Record<string, string> = {
  AU: "/ads/australia.mp3",
  IN: "/ads/india.mp3",
  PK: "/ads/pakistan.mp3",
  US: "/ads/usa.mp3",
  default: "/ad.mp3",
};

export const AD_FREQUENCY = 6; // Every 6th station change
export const AD_TIME_INTERVAL = 15 * 60 * 1000; // 15 minutes
export const AD_COOLDOWN = 5 * 60 * 1000; // 3 minutes minimum between ads

// Supported countries for ads
export const AD_COUNTRIES = [
  "australia",
  "uk",
  "india",
  "usa",
  "uae",
  "canada",
  "pakistan",
  "bangladesh",
  "kuwait",
  "south-africa",
] as const;

/**
 * Get list of available ads for a country by checking numbered files
 */
const getAvailableAdsForCountry = async (country: string): Promise<string[]> => {
  const ads: string[] = [];

  // Try to fetch up to 20 ad files (ad1.mp3, ad2.mp3, etc.)
  for (let i = 1; i <= 20; i++) {
    const adUrl = `/ads/${country}/ad${i}.mp3`;
    try {
      const response = await fetch(adUrl, { method: "HEAD" });
      if (response.ok) {
        ads.push(adUrl);
      } else {
        break; // Stop checking if file doesn't exist
      }
    } catch {
      break;
    }
  }

  return ads;
};

/**
 * Get a random ad URL based on user's detected country
 * Randomly selects from available ads in the country folder
 */
export const getAdUrlForRegion = async (): Promise<string> => {
  try {
    const country = await getUserCountry();
    const ads = await getAvailableAdsForCountry(country);

    if (ads.length > 0) {
      // Randomly select an ad from available ads
      const randomIndex = Math.floor(Math.random() * ads.length);
      return ads[randomIndex];
    }

    // Fallback to old single-file structure
    return DEFAULT_AD_CONFIG[country] || DEFAULT_AD_CONFIG.default;
  } catch (error) {
    console.log("Error detecting country for ad:", error);
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
    console.error("Error loading ad analytics:", error);
  }

  // Return default analytics
  return {
    totalAdsPlayed: 0,
    adsByCountry: {},
    lastAdTimestamp: 0,
    sessionStartTime: Date.now(),
  };
};

/**
 * Save ad analytics to localStorage
 */
export const saveAdAnalytics = (analytics: AdAnalytics): void => {
  try {
    localStorage.setItem(AD_STORAGE_KEY, JSON.stringify(analytics));
  } catch (error) {
    console.error("Error saving ad analytics:", error);
  }
};

/**
 * Check if an ad should be played based on station change count
 */
export const shouldPlayAdOnStationChange = (stationChangeCount: number, lastAdTimestamp: number): boolean => {
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
export const shouldPlayAdOnTimeInterval = (sessionStartTime: number, lastAdTimestamp: number): boolean => {
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
  const country = await getUserCountry().catch(() => "unknown");

  const updatedAnalytics: AdAnalytics = {
    ...analytics,
    totalAdsPlayed: analytics.totalAdsPlayed + 1,
    adsByCountry: {
      ...analytics.adsByCountry,
      [country]: (analytics.adsByCountry[country] || 0) + 1,
    },
    lastAdTimestamp: Date.now(),
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
    sessionDuration,
  };
};

/**
 * Reset ad analytics (useful for testing)
 */
export const resetAdAnalytics = (): void => {
  localStorage.removeItem(AD_STORAGE_KEY);
};
