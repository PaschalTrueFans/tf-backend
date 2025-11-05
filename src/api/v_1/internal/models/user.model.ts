import { z } from 'zod';
import { DefaultTable } from '../../../../helpers/entities';

export const CreateUserBodySchema = z.object({
  userName: z.string(),
  email: z.string().email(),
  companyId: z.string().optional(),
  profilePhoto: z.string(),
});

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;

export const UpdateTempPasswordBodySchema = z.object({
  newPassword: z.string(),
});

export type UpdateTempPasswordBody = z.infer<typeof UpdateTempPasswordBodySchema>;

export const ResetPasswordBodySchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(1, 'New password is required'),
}).refine((data) => data.oldPassword !== data.newPassword, {
  message: 'New password must be different from old password',
  path: ['newPassword'],
});

export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>;

export const UpdateUserBodySchema = z.object({
  pageName: z.string().optional(),
  creatorName: z.string().optional(),
  is18Plus: z.boolean().optional(),
  profilePhoto: z.string().optional(),
  bio: z.string().optional(),
  coverPhoto: z.string().optional(),
  introVideo: z.string().optional(),
  themeColor: z.string().optional(),
  socialLinks: z.any().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
});

export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;

// Response interfaces
export interface CreatorProfile {
  pageName: string;
  creatorName: string;
  is18Plus: boolean;
  profilePhoto?: string;
  bio?: string;
  coverPhoto?: string;
  introVideo?: string;
  themeColor?: string;
  socialLinks?: any;
  tags?: string[];
  categoryId?: string;
  isFollowing?: boolean;
  followersCount?: number;
  subscribersCount?: number;
  category?: string;
}

export interface UserResponse extends DefaultTable {
  name: string;
  email: string;
  isVerified: boolean;
  bio: string | null;
  profilePhoto: string | null;
  creator: CreatorProfile | null;
}

// Membership schemas
export const CreateMembershipBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.string().min(1, 'Price is required'),
  currency: z.string().min(1, 'Currency is required').default('NGN'),
  description: z.string().optional(),
});

export type CreateMembershipBody = z.infer<typeof CreateMembershipBodySchema>;

export const UpdateMembershipBodySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  price: z.string().min(1, 'Price is required').optional(),
  currency: z.string().min(1, 'Currency is required').optional(),
  description: z.string().optional(),
});

export type UpdateMembershipBody = z.infer<typeof UpdateMembershipBodySchema>;

// Membership response interface
export interface MembershipResponse extends DefaultTable {
  creatorId: string;
  name: string;
  price: string;
  currency: string;
  description?: string;
}

// Product schemas
export const CreateProductBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  mediaUrl: z.string().optional(),
  price: z.string().min(1, 'Price is required'),
});

export type CreateProductBody = z.infer<typeof CreateProductBodySchema>;

export const UpdateProductBodySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  mediaUrl: z.string().optional(),
  price: z.string().min(1, 'Price is required').optional(),
});

export type UpdateProductBody = z.infer<typeof UpdateProductBodySchema>;

// Product response interface
export interface ProductResponse extends DefaultTable {
  creatorId: string;
  name: string;
  description?: string;
  mediaUrl?: string;
  price: string;
}

// Event schemas
export const CreateEventBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  mediaUrl: z.string().optional(),
  eventDate: z.string().optional(),
  liveStreamLink: z.string().optional(),
  isFree: z.boolean().optional().default(true),
  memberShipId: z.string().optional(),
});

export type CreateEventBody = z.infer<typeof CreateEventBodySchema>;

export const UpdateEventBodySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  mediaUrl: z.string().optional(),
  eventDate: z.string().optional(),
  liveStreamLink: z.string().optional(),
  isFree: z.boolean().optional(),
  memberShipId: z.string().optional(),
});

export type UpdateEventBody = z.infer<typeof UpdateEventBodySchema>;

// Event response interface
export interface EventResponse extends DefaultTable {
  creatorId: string;
  name: string;
  description?: string;
  mediaUrl?: string;
  eventDate?: string;
  liveStreamLink?: string;
  isFree?: boolean;
  memberShipId?: string;
}
