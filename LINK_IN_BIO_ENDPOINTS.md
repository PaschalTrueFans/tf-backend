# Link-in-Bio API Endpoints Reference

## Quick Copy Snippets

### Get Public Profile
```bash
curl http://localhost:8000/johndoe/links
```

### Track View
```bash
curl -X POST http://localhost:8000/api/v_1/internal/link-in-bio/track/view/johndoe \
  -H "Content-Type: application/json" \
  -d '{"deviceType":"mobile","referrer":"https://google.com"}'
```

### Track Click
```bash
curl -X POST http://localhost:8000/api/v_1/internal/link-in-bio/track/click \
  -H "Content-Type: application/json" \
  -d '{"linkId":"<uuid>","username":"johndoe","deviceType":"mobile"}'
```

### Get My Profile (Authenticated)
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v_1/internal/link-in-bio/my-profile/get
```

### Update My Profile (Authenticated)
```bash
curl -X PUT http://localhost:8000/api/v_1/internal/link-in-bio/my-profile/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "displayName":"John Doe",
    "profileImage":"https://...",
    "coverImage":"https://...",
    "bio":"Welcome to my links!",
    "theme":"true-fans",
    "background":{"type":"gradient","value":"linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)"},
    "customColors":{"primary":"#FF6B35"},
    "customFont":"Inter",
    "links":[{"type":"standard","title":"My Website","url":"https://example.com","icon":"🌐","isActive":true,"order":0}],
    "socialLinks":{"instagram":"https://instagram.com/johndoe"},
    "showLatestPosts":true,
    "isPublished":false
  }'
```

### Publish Profile (Authenticated)
```bash
curl -X POST http://localhost:8000/api/v_1/internal/link-in-bio/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"isPublished":true}'
```

### Get Analytics (Authenticated)
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v_1/internal/link-in-bio/analytics/get?startDate=2025-11-01&endDate=2025-11-30"
```

### Get Profile by Custom Slug (Public)
```bash
curl http://localhost:8000/api/v_1/internal/link-in-bio/slug/my-custom-slug
```

---

## Detailed Endpoint Documentation

### 1. GET /:username/links
**Get Public Profile (Friendly URL)**

- **URL:** `GET /:username/links`
- **Authentication:** Not required
- **Path Parameters:**
  - `username` (string, required) - Creator's username

**Usage:**
```bash
curl http://localhost:8000/johndoe/links
```

**Response (200 OK):**
```json
{
  "userId": "uuid",
  "username": "johndoe",
  "displayName": "John Doe",
  "profileImage": "https://...",
  "coverImage": "https://...",
  "bio": "Welcome to my links!",
  "theme": "true-fans",
  "background": {
    "type": "gradient",
    "value": "linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)"
  },
  "customColors": null,
  "customFont": "Inter",
  "links": [
    {
      "id": "uuid",
      "type": "standard",
      "title": "Become my True Fan",
      "url": "https://www.truefans.ng",
      "icon": "🌐",
      "clicks": 0,
      "order": 0,
      "isActive": true
    }
  ],
  "socialLinks": {
    "instagram": "https://instagram.com/johndoe",
    "twitter": "https://twitter.com/johndoe"
  },
  "showLatestPosts": true,
  "analytics": {
    "totalViews": 1500,
    "totalClicks": 850
  },
  "isPublished": true,
  "customSlug": null,
  "seoTitle": "John Doe - Links",
  "seoDescription": "All my important links",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Notes:**
- Returns only published profiles
- Returns only active links and scheduled links within their time window
- Returns public analytics summary

**Error Responses:**
- `404 Not Found` - Profile doesn't exist or not published

---

### 2. GET /api/v_1/internal/link-in-bio/:username
**Get Public Profile (Internal API)**

- **URL:** `GET /api/v_1/internal/link-in-bio/:username`
- **Authentication:** Not required
- **Path Parameters:**
  - `username` (string, required) - Creator's username

**Usage:**
```bash
curl http://localhost:8000/api/v_1/internal/link-in-bio/johndoe
```

**Response:** Same as endpoint #1

---

### 3. GET /api/v_1/internal/link-in-bio/my-profile/get
**Get My Profile for Editing (Authenticated)**

- **URL:** `GET /api/v_1/internal/link-in-bio/my-profile/get`
- **Authentication:** JWT required
- **Headers:**
  - `Authorization: Bearer <jwt-token>`

**Usage:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v_1/internal/link-in-bio/my-profile/get
```

**Response (200 OK):**
```json
{
  "data": {
    "userId": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "profileImage": "https://...",
    "coverImage": "https://...",
    "bio": "Welcome to my links!",
    "theme": "true-fans",
    "background": {"type": "gradient", "value": "..."},
    "customColors": null,
    "customFont": "Inter",
    "links": [
      {
        "id": "uuid",
        "type": "standard",
        "title": "Become my True Fan",
        "url": "https://www.truefans.ng",
        "icon": "🌐",
        "isActive": true,
        "order": 0,
        "clicks": 0
      },
      {
        "id": "uuid",
        "type": "standard",
        "title": "My Website",
        "url": "https://example.com",
        "icon": "🌐",
        "isActive": true,
        "order": 1,
        "clicks": 45
      }
    ],
    "socialLinks": {
      "instagram": "https://instagram.com/johndoe",
      "twitter": "https://twitter.com/johndoe"
    },
    "showLatestPosts": true,
    "analytics": {"totalViews": 1500, "totalClicks": 850},
    "isPublished": true,
    "customSlug": null,
    "seoTitle": "John Doe - Links",
    "seoDescription": "All my important links",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Notes:**
- Returns ALL links (active, inactive, scheduled)
- Includes full link details for editing
- Used to populate the editor UI

**Error Responses:**
- `401 Unauthorized` - No valid token
- `404 Not Found` - Profile doesn't exist (will be auto-created on first access)

---

### 4. PUT /api/v_1/internal/link-in-bio/my-profile/update
**Update/Create My Profile (Authenticated)**

- **URL:** `PUT /api/v_1/internal/link-in-bio/my-profile/update`
- **Authentication:** JWT required
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt-token>`

**Request Body:**
```json
{
  "displayName": "John Doe",
  "profileImage": "https://example.com/photo.jpg",
  "coverImage": "https://example.com/cover.jpg",
  "bio": "Welcome to my link-in-bio!",
  "theme": "true-fans",
  "background": {
    "type": "gradient",
    "value": "linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)"
  },
  "customColors": {
    "primary": "#FF6B35",
    "secondary": "#004E89",
    "text": "#1A1A1A",
    "background": "#FFFFFF"
  },
  "customFont": "Inter",
  "links": [
    {
      "type": "standard",
      "title": "My Website",
      "url": "https://example.com",
      "icon": "🌐",
      "isActive": true,
      "order": 0,
      "scheduledStart": null,
      "scheduledEnd": null,
      "customStyles": null
    },
    {
      "type": "standard",
      "title": "Instagram",
      "url": "https://instagram.com/johndoe",
      "icon": "📸",
      "isActive": true,
      "order": 1
    }
  ],
  "socialLinks": {
    "instagram": "https://instagram.com/johndoe",
    "twitter": "https://twitter.com/johndoe",
    "facebook": "https://facebook.com/johndoe",
    "youtube": "https://youtube.com/johndoe",
    "tiktok": "https://tiktok.com/@johndoe",
    "snapchat": "https://snapchat.com/add/johndoe",
    "github": "https://github.com/johndoe",
    "website": "https://johndoe.com",
    "spotify": "https://spotify.com/user/johndoe"
  },
  "showLatestPosts": true,
  "isPublished": false,
  "seoTitle": "John Doe - Links",
  "seoDescription": "All my important links in one place"
}
```

**Usage:**
```bash
curl -X PUT http://localhost:8000/api/v_1/internal/link-in-bio/my-profile/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "displayName":"John Doe",
    "profileImage":"https://...",
    "bio":"Welcome!",
    "theme":"true-fans",
    "background":{"type":"gradient","value":"linear-gradient(...)"},
    "links":[
      {"type":"standard","title":"My Website","url":"https://example.com","icon":"🌐","isActive":true,"order":0}
    ],
    "socialLinks":{"instagram":"https://instagram.com/johndoe"},
    "showLatestPosts":true,
    "isPublished":false
  }'
```

**Response (200 OK):**
```json
{
  "data": {
    "userId": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "profileImage": "https://...",
    "coverImage": "https://...",
    "bio": "Welcome!",
    "theme": "true-fans",
    "background": {"type": "gradient", "value": "..."},
    "customColors": null,
    "customFont": "Inter",
    "links": [
      {
        "id": "uuid",
        "type": "standard",
        "title": "Become my True Fan",
        "url": "https://www.truefans.ng",
        "icon": "🌐",
        "isActive": true,
        "order": 0,
        "clicks": 0
      },
      {
        "id": "uuid",
        "type": "standard",
        "title": "My Website",
        "url": "https://example.com",
        "icon": "🌐",
        "isActive": true,
        "order": 1,
        "clicks": 0
      }
    ],
    "socialLinks": {"instagram": "https://instagram.com/johndoe"},
    "showLatestPosts": true,
    "isPublished": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Important Notes:**
- The "Become my True Fan" link is ALWAYS the first link (order 0) and CANNOT be removed
- All provided links will be offset to start at order 1
- If you don't provide links, only the default "Become my True Fan" link will exist
- All fields are optional except that at least the default link will always be created
- Custom links can have scheduling (scheduledStart/scheduledEnd)
- Runs in a transaction - all-or-nothing operation

**Validation Rules:**
- `bio`: max 500 characters
- `displayName`: max 255 characters
- `seoTitle`: max 255 characters
- Link `title`: max 255 characters, required if link is provided
- Link `url`: must be valid URL (http/https only)
- `theme`: must be one of valid themes (true-fans, minimalist, dark-mode, glassmorphism, gradient-pop, neon-nights, nature, retro-wave, corporate, brutalist, pastel-dream)

**Error Responses:**
- `401 Unauthorized` - No valid token
- `400 Bad Request` - Validation error (malformed URL, invalid theme, etc.)

---

### 5. POST /api/v_1/internal/link-in-bio/track/view/:username
**Track Profile View (Public)**

- **URL:** `POST /api/v_1/internal/link-in-bio/track/view/:username`
- **Authentication:** Not required
- **Path Parameters:**
  - `username` (string, required) - Creator's username
- **Headers:**
  - `Content-Type: application/json`

**Request Body:**
```json
{
  "deviceType": "mobile",
  "referrer": "https://google.com"
}
```

**Usage:**
```bash
curl -X POST http://localhost:8000/api/v_1/internal/link-in-bio/track/view/johndoe \
  -H "Content-Type: application/json" \
  -d '{"deviceType":"mobile","referrer":"https://google.com"}'
```

**Response (204 No Content)**

**Notes:**
- Rate limited: 1 view per IP per profile per 5 minutes
- If rate-limited, silently returns 204 (no error)
- Extracts IP from request headers
- Extracts User-Agent automatically
- `deviceType` is optional (mobile, desktop, tablet)
- `referrer` is optional

---

### 6. POST /api/v_1/internal/link-in-bio/track/click
**Track Link Click (Public)**

- **URL:** `POST /api/v_1/internal/link-in-bio/track/click`
- **Authentication:** Not required
- **Headers:**
  - `Content-Type: application/json`

**Request Body:**
```json
{
  "linkId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "deviceType": "mobile"
}
```

**Usage:**
```bash
curl -X POST http://localhost:8000/api/v_1/internal/link-in-bio/track/click \
  -H "Content-Type: application/json" \
  -d '{"linkId":"550e8400-e29b-41d4-a716-446655440000","username":"johndoe","deviceType":"mobile"}'
```

**Response (204 No Content)**

**Notes:**
- Rate limited: 1 click per IP per link per 1 minute
- If rate-limited, silently returns 204 (no error)
- Automatically increments `click_count` on the link
- Extracts IP and User-Agent from request headers
- `deviceType` is optional (mobile, desktop, tablet)
- Requires both `linkId` and `username` to identify the correct link

---

### 7. POST /api/v_1/internal/link-in-bio/publish
**Publish/Unpublish Profile (Authenticated)**

- **URL:** `POST /api/v_1/internal/link-in-bio/publish`
- **Authentication:** JWT required
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt-token>`

**Request Body:**
```json
{
  "isPublished": true
}
```

**Usage:**
```bash
curl -X POST http://localhost:8000/api/v_1/internal/link-in-bio/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"isPublished":true}'
```

**Response (200 OK):**
```json
{
  "data": {
    "isPublished": true,
    "publishedAt": "2025-12-02T21:47:00Z"
  }
}
```

**Notes:**
- To publish (`isPublished: true`), profile must have at least 1 active link
- The default "Become my True Fan" CTA counts towards this requirement
- Once published, the profile is accessible at `/:username/links`
- Can unpublish at any time (`isPublished: false`)

**Error Responses:**
- `401 Unauthorized` - No valid token
- `400 Bad Request` - Must have at least 1 active link to publish
- `404 Not Found` - Profile doesn't exist

---

### 8. GET /api/v_1/internal/link-in-bio/analytics/get
**Get Profile Analytics (Authenticated)**

- **URL:** `GET /api/v_1/internal/link-in-bio/analytics/get`
- **Authentication:** JWT required
- **Headers:**
  - `Authorization: Bearer <jwt-token>`
- **Query Parameters (all optional):**
  - `startDate` (ISO 8601 string) - Default: 90 days ago
  - `endDate` (ISO 8601 string) - Default: now

**Usage:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v_1/internal/link-in-bio/analytics/get?startDate=2025-11-01&endDate=2025-11-30"
```

**Response (200 OK):**
```json
{
  "data": {
    "totalViews": 1500,
    "totalClicks": 850,
    "clicksByLink": {
      "550e8400-e29b-41d4-a716-446655440000": 320,
      "550e8400-e29b-41d4-a716-446655440001": 95,
      "550e8400-e29b-41d4-a716-446655440002": 435
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
      "instagram.com": 300,
      "facebook.com": 150
    },
    "conversionRate": "56.67"
  }
}
```

**Notes:**
- Default date range is last 90 days
- Aggregates all views and clicks in the specified date range
- Conversion rate = (total clicks / total views) * 100
- Device breakdown includes: mobile, desktop, tablet
- Geographic data uses 2-letter country codes
- Referrer data shows top 10 referring domains
- All metrics exclude rate-limited requests

**Error Responses:**
- `401 Unauthorized` - No valid token
- `404 Not Found` - Profile doesn't exist
- `500 Internal Server Error` - Database query failure

---

### 9. GET /api/v_1/internal/link-in-bio/slug/:slug
**Get Profile by Custom Slug (Public)**

- **URL:** `GET /api/v_1/internal/link-in-bio/slug/:slug`
- **Authentication:** Not required
- **Path Parameters:**
  - `slug` (string, required) - Custom slug

**Usage:**
```bash
curl http://localhost:8000/api/v_1/internal/link-in-bio/slug/my-custom-slug
```

**Response (200 OK):**
```json
{
  "data": {
    "userId": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "profileImage": "https://...",
    "coverImage": "https://...",
    "bio": "Welcome to my links!",
    "theme": "true-fans",
    "background": {"type": "gradient", "value": "..."},
    "customColors": null,
    "customFont": "Inter",
    "links": [...],
    "socialLinks": {...},
    "showLatestPosts": true,
    "analytics": {"totalViews": 1500, "totalClicks": 850},
    "isPublished": true,
    "customSlug": "my-custom-slug",
    "seoTitle": "John Doe - Links",
    "seoDescription": "All my important links",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Notes:**
- Returns only published profiles
- Returns only active and scheduled links within time window
- Similar to the username endpoint but uses custom slug instead

**Error Responses:**
- `404 Not Found` - Profile with that slug doesn't exist or not published

---

## Available Themes

```
true-fans (default)
minimalist
dark-mode
glassmorphism
gradient-pop
neon-nights
nature
retro-wave
corporate
brutalist
pastel-dream
```

## Link Types

```
standard    - Regular link
header      - Section header
social      - Social media link
embedded    - Embedded content
divider     - Visual divider
post        - Link to a post
```

## Important Notes

### Mandatory "Become my True Fan" Link
- Always present as the first link (order_index: 0)
- Cannot be removed by users
- Uses platform logo emoji (🌐)
- Links to https://www.truefans.ng
- Automatically enforced on profile update

### Rate Limiting
- View tracking: 1 per IP per profile per 5 minutes
- Click tracking: 1 per IP per link per 1 minute
- Silently returns 204 on rate-limited requests (no error thrown)

### Authentication
- Protected endpoints require JWT token in `Authorization: Bearer <token>` header
- Token obtained from `/api/v_1/internal/auth/login` (standard auth flow)

### Data Sync
- User profile updates automatically sync to link-in-bio
- Fields synced: name, profilePhoto, coverPhoto, bio, pageName
- Sync failures don't block the user profile update

### Default Profile Values
When a user accesses their link-in-bio for the first time, a profile is auto-created with:
- Default theme: "true-fans"
- Default gradient background
- Default "Become my True Fan" CTA link
- Profile synced from user data (name, photo, bio, username)

## Example: Complete Profile Creation & Publishing Flow

```bash
# 1. Get or create profile
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v_1/internal/link-in-bio/my-profile/get

# 2. Update profile with custom links
curl -X PUT http://localhost:8000/api/v_1/internal/link-in-bio/my-profile/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "displayName":"Jane Smith",
    "profileImage":"https://example.com/jane.jpg",
    "bio":"Creator & Designer",
    "theme":"minimalist",
    "links":[
      {"type":"standard","title":"Portfolio","url":"https://janesmith.com","icon":"🎨","isActive":true,"order":0},
      {"type":"standard","title":"YouTube","url":"https://youtube.com/@janesmith","icon":"📹","isActive":true,"order":1}
    ],
    "socialLinks":{"instagram":"https://instagram.com/janesmith"},
    "isPublished":false
  }'

# 3. Publish the profile
curl -X POST http://localhost:8000/api/v_1/internal/link-in-bio/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"isPublished":true}'

# 4. View public profile
curl http://localhost:8000/janesmith/links

# 5. Track a view (frontend fires this on page load)
curl -X POST http://localhost:8000/api/v_1/internal/link-in-bio/track/view/janesmith \
  -H "Content-Type: application/json" \
  -d '{"deviceType":"mobile","referrer":"https://instagram.com"}'

# 6. Track a click (frontend fires this when user clicks a link)
curl -X POST http://localhost:8000/api/v_1/internal/link-in-bio/track/click \
  -H "Content-Type: application/json" \
  -d '{"linkId":"<link-uuid>","username":"janesmith","deviceType":"mobile"}'

# 7. Get analytics
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v_1/internal/link-in-bio/analytics/get?startDate=2025-12-01"
```
