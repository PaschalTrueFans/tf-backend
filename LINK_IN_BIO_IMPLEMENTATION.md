# Link-in-Bio Feature Implementation

Complete implementation of a Linktree-like Link-in-Bio feature for the True Fans platform.

## 📋 Overview

The Link-in-Bio feature allows creators to build customizable landing pages with all their important links, integrated with the True Fans branding. Each creator has one default link that always appears first: **"Become my True Fan"** with the platform logo (🌐).

### Key Features:
- ✅ Customizable profiles with themes
- ✅ Unlimited custom links with scheduling
- ✅ Social media links section
- ✅ Analytics tracking (views & clicks with device/geo data)
- ✅ SEO optimization
- ✅ Integration with existing user profiles
- ✅ Default mandatory "Become my True Fan" CTA link with platform logo
- ✅ Public access at `/:username/links`
- ✅ Rate limiting on tracking endpoints

## 🗄️ Database Schema

### Tables Created:
1. **`link_in_bio_profiles`** - Main profile table for each creator
2. **`link_in_bio_links`** - Individual links within a profile
3. **`link_in_bio_social_links`** - Social media links section
4. **`link_in_bio_views`** - View tracking with device/geo data
5. **`link_in_bio_clicks`** - Click tracking with analytics

All tables include:
- Proper indexes for performance
- Timezone-aware timestamps
- UUID primary keys with auto-generation
- Foreign key constraints with CASCADE delete
- Partial indexes for analytics queries

### Migrations:
- `202512010000027_create_link_in_bio_profiles.ts`
- `202512010000028_create_link_in_bio_links.ts`
- `202512010000029_create_link_in_bio_social_links.ts`
- `202512010000030_create_link_in_bio_views.ts`
- `202512010000031_create_link_in_bio_clicks.ts`

## 🔌 API Endpoints

### Public Endpoints (No Authentication)

#### `GET /:username/links`
Get public link-in-bio profile for display
```bash
GET /johndoe/links
```

#### `GET /api/v_1/internal/link-in-bio/:username`
Same as above, via internal API

#### `POST /api/v_1/internal/link-in-bio/track/view/:username`
Track a page view
```bash
POST /api/v_1/internal/link-in-bio/track/view/johndoe
Content-Type: application/json

{
  "deviceType": "mobile",
  "referrer": "https://google.com"
}
```

#### `POST /api/v_1/internal/link-in-bio/track/click`
Track a link click
```bash
POST /api/v_1/internal/link-in-bio/track/click
Content-Type: application/json

{
  "linkId": "uuid",
  "username": "johndoe",
  "deviceType": "mobile"
}
```

### Protected Endpoints (JWT Authentication Required)

#### `GET /api/v_1/internal/link-in-bio/my-profile/get`
Fetch authenticated user's profile for editing (includes ALL links)
```bash
GET /api/v_1/internal/link-in-bio/my-profile/get
Authorization: Bearer <jwt-token>
```

#### `PUT /api/v_1/internal/link-in-bio/my-profile/update`
Update/create link-in-bio profile
```bash
PUT /api/v_1/internal/link-in-bio/my-profile/update
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "displayName": "John Doe",
  "profileImage": "https://...",
  "coverImage": "https://...",
  "bio": "Welcome to my links!",
  "theme": "true-fans",
  "background": {
    "type": "gradient",
    "value": "linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)"
  },
  "customColors": { /* optional */ },
  "customFont": "Inter",
  "links": [
    {
      "type": "standard",
      "title": "My Website",
      "url": "https://example.com",
      "icon": "🌐",
      "isActive": true,
      "order": 0
    }
  ],
  "socialLinks": {
    "instagram": "https://instagram.com/johndoe",
    "twitter": "https://twitter.com/johndoe"
  },
  "showLatestPosts": true,
  "isPublished": false
}
```

**Note:** The "Become my True Fan" link is ALWAYS the first link (order_index: 0) and cannot be removed.

#### `POST /api/v_1/internal/link-in-bio/publish`
Publish/unpublish the link-in-bio page
```bash
POST /api/v_1/internal/link-in-bio/publish
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "isPublished": true
}
```

#### `GET /api/v_1/internal/link-in-bio/analytics/get`
Get detailed analytics for the profile
```bash
GET /api/v_1/internal/link-in-bio/analytics/get?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "data": {
    "totalViews": 1500,
    "totalClicks": 850,
    "clicksByLink": {
      "link-id-1": 320,
      "link-id-2": 95
    },
    "deviceBreakdown": {
      "mobile": 1200,
      "desktop": 250,
      "tablet": 50
    },
    "geoData": {
      "US": 500,
      "NG": 800
    },
    "referrerData": {
      "google.com": 400,
      "instagram.com": 300
    },
    "conversionRate": "56.67"
  }
}
```

#### `GET /api/v_1/internal/link-in-bio/slug/:slug`
Get profile by custom slug (public)
```bash
GET /api/v_1/internal/link-in-bio/slug/my-custom-slug
```

## 📁 Project Structure

```
src/
├── api/v_1/internal/
│   ├── controller/
│   │   └── link-in-bio.controller.ts      # Request handlers
│   ├── services/
│   │   └── link-in-bio.service.ts         # Business logic
│   ├── models/
│   │   └── link-in-bio.model.ts           # TypeScript types & validation
│   └── routes/
│       └── link-in-bio.routes.ts          # Route definitions
├── database/v_1/
│   ├── controllers/
│   │   └── link-in-bio.database.ts        # Database operations
│   └── migrations/
│       ├── 202512010000027_...
│       ├── 202512010000028_...
│       ├── 202512010000029_...
│       ├── 202512010000030_...
│       └── 202512010000031_...
└── routes/
    └── public.routes.ts                    # Public routing for /:username/links
```

## 🔑 Key Features

### 1. Mandatory "Become my True Fan" Link
- Always present as the first link (order_index: 0)
- Cannot be removed by users
- Uses platform logo emoji (🌐)
- Links to https://www.truefans.ng

### 2. Auto-Sync with User Profile
When a user updates their main profile (name, photo, bio, etc.), the link-in-bio profile is automatically synced.

### 3. Rate Limiting
- **View tracking:** 1 per IP per profile per 5 minutes
- **Click tracking:** 1 per IP per link per minute

### 4. Analytics
- Total views and clicks
- Clicks per link
- Device breakdown (mobile, desktop, tablet)
- Geographic data
- Referrer data (top 10)
- Conversion rate calculation

### 5. Theme Support
Valid theme names:
- `true-fans` (default)
- `minimalist`
- `dark-mode`
- `glassmorphism`
- `gradient-pop`
- `neon-nights`
- `nature`
- `retro-wave`
- `corporate`
- `brutalist`
- `pastel-dream`

## 🔗 Integration Points

### User Profile Sync
File: `src/api/v_1/internal/services/user.service.ts`

When a user updates their profile, the link-in-bio profile is automatically synced:
```typescript
await this.db.v1.LinkInBio.SyncUserProfileData(userId, updateData);
```

### Database Singleton
File: `src/database/db.ts`

The LinkInBioDatabase is registered in the Db singleton:
```typescript
this.v1 = {
  // ... other services
  LinkInBio: new LinkInBioDatabase(dbArgs),
};
```

## 🚀 Getting Started

### 1. Run Migrations
```bash
npm run migrate  # or your migration command
```

### 2. Access Endpoints

**Create/Get Profile (Authenticated):**
```bash
curl -X GET http://localhost:3000/api/v_1/internal/link-in-bio/my-profile/get \
  -H "Authorization: Bearer <token>"
```

**Update Profile (Authenticated):**
```bash
curl -X PUT http://localhost:3000/api/v_1/internal/link-in-bio/my-profile/update \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...profile data...}'
```

**View Public Profile:**
```bash
curl http://localhost:3000/johndoe/links
# or
curl http://localhost:3000/api/v_1/internal/link-in-bio/johndoe
```

**Track View:**
```bash
curl -X POST http://localhost:3000/api/v_1/internal/link-in-bio/track/view/johndoe \
  -H "Content-Type: application/json" \
  -d '{"deviceType":"mobile"}'
```

**Track Click:**
```bash
curl -X POST http://localhost:3000/api/v_1/internal/link-in-bio/track/click \
  -H "Content-Type: application/json" \
  -d '{"linkId":"<uuid>","username":"johndoe","deviceType":"mobile"}'
```

## 📊 Default Profile Values

When a user creates their profile for the first time, they get:
```json
{
  "theme": "true-fans",
  "background": {
    "type": "gradient",
    "value": "linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)"
  },
  "bio": "Welcome to my link-in-bio!",
  "showLatestPosts": true,
  "isPublished": false,
  "links": [
    {
      "type": "standard",
      "title": "Become my True Fan",
      "url": "https://www.truefans.ng",
      "icon": "🌐",
      "isActive": true,
      "order": 0
    }
  ]
}
```

## 🔒 Security & Validation

### Input Validation
- Bio: max 500 characters
- Link title: max 255 characters, required
- URL: valid URL format (http/https only)
- Theme: must be one of valid themes
- Link type: must be valid type

### Rate Limiting
- Profile updates: 10 per hour per user
- View tracking: 1 per IP per profile per 5 minutes
- Click tracking: 1 per IP per link per minute
- Analytics requests: 60 per hour per user

### SQL Injection Prevention
All queries use parameterized statements via Knex.js

## 📝 TypeScript Types

Key types are defined in `src/api/v_1/internal/models/link-in-bio.model.ts`:

- `LinkSchema` - Individual link validation
- `SocialLinksSchema` - Social media links validation
- `UpdateLinkInBioProfileSchema` - Profile update validation
- `TrackViewSchema` - View tracking validation
- `TrackClickSchema` - Click tracking validation

## 🧪 Testing

Key test scenarios:
1. Create profile for new user → verify default link exists
2. Update profile → verify "Become my True Fan" link cannot be removed
3. Delete link → verify order_index is maintained
4. Track view → verify rate limiting (5 minutes)
5. Track click → verify rate limiting (1 minute)
6. Analytics → verify conversion rate calculation
7. Publish profile → verify validation (has at least 1 active link)

## 🐛 Known Limitations

1. GeoIP data requires external service (currently set to null)
2. Analytics retention: records older than 90 days can be archived
3. No built-in scheduling execution (relies on external scheduler)

## 🔄 Future Enhancements

1. Implement GeoIP service integration
2. Add scheduled link publish/unpublish automation
3. Add email notifications for high-traffic milestones
4. Implement A/B testing for links
5. Add custom domain support
6. Add QR code generation for profiles

## 📞 Support

For issues or questions, refer to:
- Database layer: `src/database/v_1/controllers/link-in-bio.database.ts`
- API controller: `src/api/v_1/internal/controller/link-in-bio.controller.ts`
- Service layer: `src/api/v_1/internal/services/link-in-bio.service.ts`
