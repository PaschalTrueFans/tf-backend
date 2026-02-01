import mongoose, { Schema } from 'mongoose';

const CommunitySchema = new Schema(
    {
        creatorId: { type: String, required: true, ref: 'User' },
        name: { type: String, required: true },
        description: { type: String },
        icon: { type: String },
        banner: { type: String },
        isPrivate: { type: Boolean, default: false },
        rules: { type: String },
        isVerified: { type: Boolean, default: false },
        isBlocked: { type: Boolean, default: false },
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

CommunitySchema.index({ creatorId: 1 }, { unique: true }); // One community per creator for now

export const CommunityModel = mongoose.model('Community', CommunitySchema);
