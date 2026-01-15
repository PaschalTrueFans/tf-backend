# Deep Dive: Integrating Community Features (Frontend Guide)

This guide details how to implement the new interactive features: **Polls**, **Events**, **Emojis**, and **Moderation**.

---

## 🏗️ Core Concept: Rich Message Types

We have moved beyond simple text messages. The `ChannelMessage` object now has a `type` field.
**You must switch your rendering logic based on this type.**

```typescript
type MessageType = 'text' | 'poll' | 'tip' | 'product' | 'system';

interface ChannelMessage {
  id: string;
  type: MessageType;
  content: string; // Fallback text for notifications/previews
  metadata?: any;  // The payload for the specific type (e.g. Poll ID)
  // ... other fields
}
```

---

## 🗳️ Feature 1: Polls

### Data Flow
1.  **Creation**: Use `POST /:communityId/channels/:channelId/polls`.
    *   *Payload*: `{ question: "Pizza or Tacos?", options: ["Pizza", "Tacos"], endsAt: ISO_DATE_STRING }`
2.  **Rendering**:
    *   The message `type` will be `poll`.
    *   The `metadata` or `poll` field (depending on population) will contain the `Poll` object.
    *   **UI Component**: `PollCard`.
3.  **Voting**:
    *   Call `POST /:communityId/polls/:pollId/vote` with `{ optionId }`.
    *   **Optimistic UI**: Immediately increment the local vote count for that option to make it feel instant.
    *   **Calculations**: Calculate percentage: `(option.voteCount / totalVotes) * 100`.

### Poll Object Structure
```typescript
interface Poll {
  id: string;
  question: string;
  isMultipleChoice: boolean;
  options: {
    id: string;
    text: string;
    voteCount: number; // Use this for percentages
  }[];
  userVote?: string; // ID of the option the CURRENT user voted for (if applicable)
}
```

---

## 📅 Feature 2: Community Events

### Integration Points
1.  **Events Tab**: Create a top-level tab in the Community view called "Events".
    *   Fetch list via `GET /:communityId/events`.
    *   Render as a vertical list of `EventCard`s.
2.  **RSVP Action**:
    *   Button toggle: "Going" / "Interested" / "Not Going".
    *   Endpoint: `POST /:communityId/events/:eventId/rsvp`.
    *   Update the `goingCount` in the UI immediately.

### Event Object
```typescript
interface CommunityEvent {
  id: string;
  title: string;
  startTime: string; // ISO Date
  location?: string; // "Live Stage" or URL
  goingCount: number;
  interestedCount: number;
  // Use dayjs or date-fns to format startTime like "Fri, Jan 15 • 7:00 PM"
}
```

---

## 🎨 Feature 3: Custom Emojis

### The "Emoji Picker"
You need to integrate community-specific emojis into your chat input.

1.  **Fetching**: On load of the Community, call `GET /:communityId/emojis`.
    *   Store these in a local context/store: `communityEmojis`.
2.  **Input Autocomplete**:
    *   When user types `:`, filter `communityEmojis` by `name`.
    *   Show a popup list.
3.  **Rendering**:
    *   When rendering messages, use a Regex to replace `:code:` with an `<img>` tag using the emoji's `url`.
    *   *Example Regex*: `/:([a-zA-Z0-9_]+):/g`

### Emoji Object
```typescript
interface CommunityEmoji {
  code: string; // e.g. ":hype:"
  url: string;  // S3 URL
}
```

---

## 🛡️ Feature 4: Moderation (Reporting)

### UI Placement
*   Add a "Report" option to the **Long Press** (Mobile) or **Three Dot Menu** (Desktop) context menu for *every* message.

### Interaction
1.  User clicks "Report".
2.  Open Modal: "Why are you reporting this?" (Spam, Harassment, etc.).
3.  On Submit: Call `POST /:communityId/report`.
    *   Payload: `{ targetId: message.id, targetType: 'message', reason: "Spam" }`.
4.  **Feedback**: Show a toast "Report submitted. Thank you for keeping us safe."

---

## 🔌 Checklist for Implementation

- [ ] **Styles**: Create styled components for `PollCard`, `EventCard`, and `Emoji`.
- [ ] **State**: Add `events` and `emojis` to your Community Context / Redux Store.
- [ ] **Safety**: Ensure you check `member.roles` for permissions (e.g., only Admins can *Create* events, but everyone can *RSVP*).
