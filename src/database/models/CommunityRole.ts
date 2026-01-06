import mongoose, { Schema } from 'mongoose';

const CommunityRoleSchema = new Schema(
    {
        communityId: { type: String, required: true, ref: 'Community' },
        name: { type: String, required: true },
        color: { type: String },
        levelRequirement: { type: Number, default: 0 },
        permissions: [{ type: String }], // 'manage_channels', 'kick_members', etc.
        position: { type: Number, default: 0 }, // For hierarchy comparison
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

CommunityRoleSchema.index({ communityId: 1 });

export const CommunityRoleModel = mongoose.model('CommunityRole', CommunityRoleSchema);
