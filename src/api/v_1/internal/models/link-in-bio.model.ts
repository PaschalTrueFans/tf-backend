import { z } from 'zod';

// Link schema
// NOTE: The "Become my True Fan" link is mandatory and cannot be removed
// It will always be the first link (order_index: 0) with the platform logo
export const LinkSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['standard', 'header', 'social', 'embedded', 'divider', 'post']).default('standard'),
  title: z.string().max(255, 'Title must be 255 characters or less'),
  url: z.string().url('Invalid URL format').nullable().optional(),
  icon: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().nonnegative().default(0),
  scheduledStart: z.date().nullable().optional(),
  scheduledEnd: z.date().nullable().optional(),
  customStyles: z.any().nullable().optional(),
  platform: z.string().nullable().optional(),
  embedCode: z.string().nullable().optional(),
  postId: z.string().uuid().nullable().optional(),
});

export type Link = z.infer<typeof LinkSchema>;

// Social links schema
// Accepts either URLs (https://...) or usernames (handles, @mentions, etc)
export const SocialLinksSchema = z.object({
  instagram: z.string().min(1).nullable().optional(),
  twitter: z.string().min(1).nullable().optional(),
  facebook: z.string().min(1).nullable().optional(),
  youtube: z.string().min(1).nullable().optional(),
  tiktok: z.string().min(1).nullable().optional(),
  snapchat: z.string().min(1).nullable().optional(),
  github: z.string().min(1).nullable().optional(),
  website: z.string().url().nullable().optional(),
  spotify: z.string().min(1).nullable().optional(),
});

export type SocialLinks = z.infer<typeof SocialLinksSchema>;

// Profile update schema
export const UpdateLinkInBioProfileSchema = z.object({
  displayName: z.string().max(255).nullable().optional(),
  profileImage: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  theme: z.string().max(50).default('true-fans'),
  background: z.object({
    type: z.enum(['color', 'gradient', 'image', 'video']),
    value: z.string().nullable(),
  }).nullable().optional(),
  customColors: z.any().nullable().optional(),
  customFont: z.string().max(100).nullable().optional(),
  links: z.array(LinkSchema).optional(),
  socialLinks: SocialLinksSchema.optional(),
  showLatestPosts: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().max(255).nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export type UpdateLinkInBioProfile = z.infer<typeof UpdateLinkInBioProfileSchema>;

// Publish schema
export const PublishLinkInBioSchema = z.object({
  isPublished: z.boolean(),
});

export type PublishLinkInBio = z.infer<typeof PublishLinkInBioSchema>;

// Track view schema
export const TrackViewSchema = z.object({
  deviceType: z.enum(['mobile', 'desktop', 'tablet']).nullable().optional(),
  referrer: z.string().nullable().optional(),
});

export type TrackView = z.infer<typeof TrackViewSchema>;

// Track click schema
export const TrackClickSchema = z.object({
  linkId: z.string().uuid('Invalid link ID'),
  username: z.string(),
  deviceType: z.enum(['mobile', 'desktop', 'tablet']).nullable().optional(),
});

export type TrackClick = z.infer<typeof TrackClickSchema>;

// Response types
export interface LinkInBioProfileResponse {
  userId: string;
  username: string;
  displayName?: string;
  profileImage?: string;
  coverImage?: string;
  bio?: string;
  theme: string;
  background?: {
    type: string;
    value?: string;
  };
  customColors?: any;
  customFont?: string;
  links: Link[];
  socialLinks?: SocialLinks;
  showLatestPosts: boolean;
  analytics?: {
    totalViews: number;
    totalClicks: number;
  };
  isPublished: boolean;
  customSlug?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsResponse {
  totalViews: number;
  totalClicks: number;
  topLink?: {
    id: string;
    title: string;
    clicks: number;
  };
  clicksByDate: Record<string, number>;
  clicksByLink: Record<string, number>;
  deviceBreakdown: Record<string, number>;
  geoData: Record<string, number>;
  referrerData: Record<string, number>;
  conversionRate: string | number;
}
