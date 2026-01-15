import mongoose, { Schema } from 'mongoose';

const CommunityEmojiSchema = new Schema(
    {
        communityId: { type: String, required: true, ref: 'Community' },
        name: { type: String, required: true }, // e.g. "pogchamp"
        code: { type: String, required: true }, // e.g. ":pogchamp:"
        url: { type: String, required: true },
        uploadedBy: { type: String, ref: 'User' }
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

// Ensure unique codes per community
CommunityEmojiSchema.index({ communityId: 1, code: 1 }, { unique: true });

export const CommunityEmojiModel = mongoose.model('CommunityEmoji', CommunityEmojiSchema);
