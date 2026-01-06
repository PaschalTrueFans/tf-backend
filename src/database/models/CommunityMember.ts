import mongoose, { Schema } from 'mongoose';

const CommunityMemberSchema = new Schema(
    {
        communityId: { type: String, required: true, ref: 'Community' },
        userId: { type: String, required: true, ref: 'User' },
        roles: [{ type: String, ref: 'CommunityRole' }],
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 0 },
        lastActiveAt: { type: Date, default: Date.now },
        joinedAt: { type: Date, default: Date.now },
        isMuted: { type: Boolean, default: false },
        mutedUntil: { type: Date },
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

CommunityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });
CommunityMemberSchema.index({ communityId: 1, xp: -1 }); // For leaderboards

export const CommunityMemberModel = mongoose.model('CommunityMember', CommunityMemberSchema);
