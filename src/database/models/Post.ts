import mongoose, { Schema } from 'mongoose';
import { Entities } from '../../helpers';

const PostSchema = new Schema(
    {
        creatorId: { type: String, required: true, ref: 'User' }, // Storing as string to match Entity, but typically ref should be ObjectId
        title: { type: String, required: true },
        content: { type: String, required: true },
        accessType: { type: String, default: 'free', enum: ['free', 'premium'] },
        allowedMembershipIds: [{ type: String }],
        requiredTier: { type: Number, default: 0 }, // 0: Public, 1: Tier 1+, 2: Tier 2+, 3: Tier 3
        tags: [{ type: String }],
        totalLikes: { type: Number, default: 0 },
        mediaFiles: [{
            postId: { type: String },
            url: { type: String, required: true },
            type: { type: String, required: true },
            name: { type: String },
            size: { type: Number },
            thumbnail: { type: String } // Keeping thumbnail as it was in schema even if not in interface explicitly, or maybe it should be removed? Interface doesn't show it. Keeping for safety.
        }],
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
        toObject: { virtuals: true },
    }
);

export const PostModel = mongoose.model<Entities.Post>('Post', PostSchema as any);

const CommentSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User' },
        postId: { type: String, required: true, ref: 'Post' },
        content: { type: String, required: true },
        parentCommentId: { type: String, default: null },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

export const CommentModel = mongoose.model('Comment', CommentSchema);

const LikeSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User' },
        postId: { type: String, required: true, ref: 'Post' },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

// Compound index for unique likes
LikeSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const LikeModel = mongoose.model('Like', LikeSchema);
