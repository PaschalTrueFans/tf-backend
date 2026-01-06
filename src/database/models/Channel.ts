import mongoose, { Schema } from 'mongoose';

const ChannelSchema = new Schema(
    {
        communityId: { type: String, required: true, ref: 'Community' },
        name: { type: String, required: true },
        type: { type: String, enum: ['text', 'announcement'], default: 'text' },
        position: { type: Number, default: 0 },
        isPrivate: { type: Boolean, default: false },
        allowedRoles: [{ type: String, ref: 'CommunityRole' }], // Array of role IDs
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

ChannelSchema.index({ communityId: 1, position: 1 });

export const ChannelModel = mongoose.model('Channel', ChannelSchema);
