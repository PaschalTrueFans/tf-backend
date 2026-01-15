import mongoose, { Schema } from 'mongoose';

const ChannelMessageSchema = new Schema(
    {
        channelId: { type: String, required: true, ref: 'Channel' },
        senderId: { type: String, required: true, ref: 'User' },
        content: { type: String, required: true },
        attachments: [{ type: String }],
        type: { type: String, enum: ['text', 'poll', 'tip', 'product', 'system'], default: 'text' },
        metadata: { type: Schema.Types.Mixed }, // Flexible storage for Poll ID, Product ID, Tip Amount
        parentId: { type: String, ref: 'ChannelMessage' }, // Thread root
        replyCount: { type: Number, default: 0 },
        replyToMessageId: { type: String, ref: 'ChannelMessage' }, // Simple reply (legacy or quick reply)
        isEdited: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
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

ChannelMessageSchema.index({ channelId: 1, createdAt: 1 });

export const ChannelMessageModel = mongoose.model('ChannelMessage', ChannelMessageSchema);
