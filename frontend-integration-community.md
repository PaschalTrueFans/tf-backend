# Community Integration Guide (Discovery & Insights)

This guide covers how to find communities to join and how creators can view their community performance.

## Base URL
`{{API_BASE_URL}}/api/v_1/internal/community`

*Note: Requires `Authorization: Bearer <token>` header.*

---

## 1. Explore Communities (Discovery)
Use this endpoint to let new members search for and find public communities on the platform.

- **Endpoint:** `GET /explore`
- **Query Parameters:**
  - `search`: Filter by community name or description.
  - `page`: Page number (default: 1).
  - `limit`: Items per page (default: 20).
- **Response (Success):**
```json
{
  "data": {
    "communities": [
      {
        "id": "658dc...",
        "name": "Jazz Lovers",
        "description": "The best place for jazz fans",
        "memberCount": 150,
        "isPrivate": false,
        "creator": {
          "name": "John Coltrane",
          "creatorName": "coltrane_official",
          "profilePhoto": "..."
        }
      }
    ],
    "pagination": {
       "total": 50,
       "page": 1,
       "limit": 20,
       "totalPages": 3
    }
  }
}
```

---

## 2. Join a Community
Add the current user to a community.

- **Endpoint:** `POST /:communityId/join`
- **Response (Success):**
```json
{
  "data": {
    "id": "member_id_...",
    "communityId": "...",
    "userId": "...",
    "roles": ["..."],
    "level": 0,
    "xp": 0
  }
}
```

---

## 3. Leave a Community
Remove the current user from a community.

- **Endpoint:** `POST /:communityId/leave`
- **Response (Success):**
```json
{
  "success": true,
  "message": "You have left the community"
}
```

---

## 4. Get Community Insights
Creators can use this to see how their community is growing and which channels are most active.

- **Endpoint:** `GET /:communityId/insights`
- **Response Structure:**
```json
{
  "data": {
    "overview": {
      "totalMembers": 500,
      "totalChannels": 12,
      "activeMembers7d": 180
    },
    "engagement": {
      "totalMessages": 12500,
      "messages7d": 850,
      "messagesPerMember": "25.00"
    },
    "growth": {
      "newMembers24h": 5,
      "newMembers7d": 42
    },
    "channels": [
      {
        "name": "General Chat",
        "messageCount": 8500
      }
    ]
  }
}
```
*Note: This specific endpoint only works for the community owner.*
