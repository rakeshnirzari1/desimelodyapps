# Ad System Setup Guide

Your IP-based advertising system is now fully configured! Here's what was implemented:

## ✅ What's Working

1. **Auto-resume after ads** - Radio automatically plays after ad ends or is skipped
2. **Improved ad overlay** - Better CSS styling for the commercial break banner
3. **Multi-ad support** - System can randomly play multiple ads per country
4. **Continuous playback** - Ads play every 6th station change (not just once)
5. **10 country support** - Australia, UK, India, USA, UAE, Canada, Pakistan, Bangladesh, Kuwait, South Africa
6. **Admin dashboard** - Password-protected page at `/admin/ads` for managing ads

## 📁 Migrate Your Existing Ads

You currently have these ad files in `/public/ads/`:
- `australia.mp3`
- `india.mp3`
- `pakistan.mp3`
- `usa.mp3`

### Migration Steps:

1. Create country folders inside `/public/ads/`:
   ```
   /public/ads/australia/
   /public/ads/india/
   /public/ads/pakistan/
   /public/ads/usa/
   /public/ads/uk/
   /public/ads/uae/
   /public/ads/canada/
   /public/ads/bangladesh/
   /public/ads/kuwait/
   /public/ads/south-africa/
   ```

2. Move and rename your existing files:
   - Move `australia.mp3` → `/public/ads/australia/ad1.mp3`
   - Move `india.mp3` → `/public/ads/india/ad1.mp3`
   - Move `pakistan.mp3` → `/public/ads/pakistan/ad1.mp3`
   - Move `usa.mp3` → `/public/ads/usa/ad1.mp3`

3. Add more ads to each folder:
   - `/public/ads/australia/ad2.mp3` (second Australian ad)
   - `/public/ads/australia/ad3.mp3` (third Australian ad)
   - And so on...

## 🎯 How It Works

### Random Ad Selection
- When a listener from Australia triggers an ad, the system:
  1. Detects they're from Australia via IP
  2. Checks `/public/ads/australia/` for available ads (ad1.mp3, ad2.mp3, ad3.mp3, etc.)
  3. Randomly picks one ad to play
  4. Next time, it might pick a different ad

### Ad Triggers
- **Station changes**: Every 6th time user clicks "Next Station"
- **Time-based**: Every 15 minutes of continuous listening
- **Cooldown**: Minimum 3 minutes between ads

### User Experience
- Radio pauses smoothly
- Ad overlay shows with countdown
- Skip button appears after 3 seconds
- Radio auto-resumes after ad (even if skipped)

## 🔐 Admin Dashboard

Visit **`/admin/ads`** to access the admin panel.

**Default Password**: `desimelody2024`

⚠️ **IMPORTANT**: Change the password in `/src/pages/AdminAds.tsx` line 25:
```typescript
const ADMIN_PASSWORD = 'your-secure-password-here';
```

### Current Limitations
The admin dashboard UI is ready but file uploads require **Lovable Cloud + Storage**.

To enable dynamic uploads:
1. Enable Lovable Cloud in your project
2. Configure Storage with an "ads" bucket
3. Update the admin page to connect to Supabase Storage

For now, you can manually add MP3 files to the folders.

## 📊 Analytics

Ad performance is tracked in localStorage:
- Total ads played
- Ads by country
- Session duration
- Last ad timestamp

Access analytics data via browser console:
```javascript
// View ad analytics
console.log(localStorage.getItem('desimelody_ad_analytics'));
```

## 🚀 Testing Your Setup

1. **Test single ad per country**:
   - Add `ad1.mp3` to a country folder
   - Change station 6 times
   - Ad should play

2. **Test multiple ads**:
   - Add `ad1.mp3`, `ad2.mp3`, `ad3.mp3` to a country folder
   - Change stations multiple times
   - You should hear different ads randomly

3. **Test auto-resume**:
   - Let ad play completely
   - Radio should auto-start
   - Try skipping an ad
   - Radio should auto-start

## 🌍 Country Detection

The system automatically detects user location and maps to ad regions:
- 🇦🇺 Australia → `australia`
- 🇬🇧 UK → `uk`
- 🇮🇳 India + South Asian countries → `india`
- 🇺🇸 USA (default for others) → `usa`
- 🇦🇪 UAE → `uae`
- 🇨🇦 Canada → `canada`
- 🇵🇰 Pakistan → `pakistan`
- 🇧🇩 Bangladesh → `bangladesh`
- 🇰🇼 Kuwait → `kuwait`
- 🇿🇦 South Africa → `south-africa`

## 💡 Tips

1. **Ad Length**: Keep ads 15-30 seconds for best experience
2. **File Naming**: Always use ad1.mp3, ad2.mp3 format
3. **Testing**: Use VPN to test different country ads
4. **Quality**: Use 128kbps MP3 for balance of quality/size
5. **Rotation**: Add 3-5 ads per country for good variety

## 🔧 Troubleshooting

**Ad not playing?**
- Check file is named correctly (ad1.mp3, not ad.mp3)
- Verify folder name matches country code
- Check browser console for errors

**Auto-resume not working?**
- Clear browser cache
- Check browser autoplay permissions
- Try on different browser

**Wrong ads playing?**
- System uses IP geolocation
- VPN will change detected country
- Fallback is USA ads

## 📞 Need Help?

Check these files for configuration:
- Ad logic: `/src/lib/adManager.ts`
- Country detection: `/src/lib/geolocation.ts`
- Ad playback: `/src/components/AudioPlayer.tsx`
- Admin page: `/src/pages/AdminAds.tsx`

---

**Your ad system is now revenue-ready! 💰**
