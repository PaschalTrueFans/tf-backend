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
