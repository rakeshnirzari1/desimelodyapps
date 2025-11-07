# Advertisement Files Structure

This directory contains audio advertisements organized by country/region.

## Folder Structure

Create folders for each supported country:

```
/public/ads/
├── australia/
│   ├── ad1.mp3
│   ├── ad2.mp3
│   └── ad3.mp3
├── uk/
│   ├── ad1.mp3
│   └── ad2.mp3
├── india/
│   ├── ad1.mp3
│   ├── ad2.mp3
│   └── ad3.mp3
├── usa/
│   ├── ad1.mp3
│   └── ad2.mp3
├── uae/
│   ├── ad1.mp3
│   └── ad2.mp3
├── canada/
│   ├── ad1.mp3
│   └── ad2.mp3
├── pakistan/
│   ├── ad1.mp3
│   └── ad2.mp3
├── bangladesh/
│   ├── ad1.mp3
│   └── ad2.mp3
├── kuwait/
│   ├── ad1.mp3
│   └── ad2.mp3
└── south-africa/
    ├── ad1.mp3
    └── ad2.mp3
```

## File Naming Convention

- **IMPORTANT**: Name files as `ad1.mp3`, `ad2.mp3`, `ad3.mp3`, etc.
- The system will automatically detect and randomly play ads from 1 to 20
- You can have 1 ad or multiple ads per country
- If only one ad exists, it will play repeatedly
- If multiple ads exist, the system randomly selects one each time

## Supported Countries

1. Australia (australia)
2. United Kingdom (uk)
3. India (india)
4. USA (usa)
5. UAE (uae)
6. Canada (canada)
7. Pakistan (pakistan)
8. Bangladesh (bangladesh)
9. Kuwait (kuwait)
10. South Africa (south-africa)

## Ad Playback Rules

- Ads play every **6th station change**
- Ads also play after **15 minutes** of continuous listening
- Minimum **3 minutes** cooldown between ads
- System detects user location via IP and plays regional ads
- Ads are randomly selected from available files for that region

## File Requirements

- Format: MP3
- Recommended duration: 15-30 seconds
- Audio quality: 128kbps or higher
- Keep file size reasonable (under 1MB per ad)

## How to Add New Ads

### Manual Method (Current):
1. Create the country folder if it doesn't exist
2. Add MP3 files named ad1.mp3, ad2.mp3, etc.
3. Refresh the app

### Admin Upload (Future):
- Visit `/admin/ads` (password protected)
- Enable Lovable Cloud + Storage for dynamic uploads
- Upload ads through the admin interface

## Fallback Behavior

- If no ads are found for a user's country, the system uses USA ads as fallback
- If no ads exist at all, the system continues without interruption
