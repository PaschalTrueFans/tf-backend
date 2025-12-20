import { z } from 'zod';
import { DefaultTable } from '../../../../helpers/entities';

export const MediaFileSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  url: z.string(),
  name: z.string().optional(),
  size: z.number().optional(),
});

export const CreatePostBodySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  accessType: z.string().default('free'),
  tags: z.array(z.string()).optional(),
  mediaFiles: z.array(MediaFileSchema).optional(),
});

export type CreatePostBody = z.infer<typeof CreatePostBodySchema>;

export const UpdatePostBodySchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  accessType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mediaFiles: z.array(MediaFileSchema).optional(),
});

export type UpdatePostBody = z.infer<typeof UpdatePostBodySchema>;

export interface PostListItem {
  id: string;
  title: string;
  createdAt: string;
  public: boolean;
  totalLikes: number;
  totalComments: number;
}

export interface PostDetail extends DefaultTable {
  creatorId: string;
  title: string;
  content: string;
  accessType: string;
  tags?: string[] | null;
  totalLikes: number;
  mediaFiles: Array<{
    id: string;
    type: string;
    url: string;
    name?: string | null;
    size?: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export const AddCommentBodySchema = z.object({
  comment: z.string().min(1).max(1000),
  parentCommentId: z.string().optional(),
});

export type AddCommentBody = z.infer<typeof AddCommentBodySchema>;


