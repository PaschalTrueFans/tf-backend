import mongoose, { Schema } from 'mongoose';

import { Entities } from '../../helpers';

const ConversationSchema = new Schema(
    {
        memberId: { type: String, required: true, ref: 'User' },
        creatorId: { type: String, required: true, ref: 'User' },
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
ConversationSchema.index({ memberId: 1, creatorId: 1 }, { unique: true });

export const ConversationModel = mongoose.model('Conversation', ConversationSchema);

const MessageSchema = new Schema(
    {
        conversationId: { type: String, required: true, ref: 'Conversation' },
        senderId: { type: String, required: true, ref: 'User' },
        content: { type: String, required: true },
        // Entities.Message doesn't have isRead/readAt, so we might need to extend it or suppress
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
MessageSchema.add({
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
});
MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const MessageModel = mongoose.model('Message', MessageSchema);

const ConversationReadSchema = new Schema(
    {
        conversationId: { type: String, required: true, ref: 'Conversation' },
        userId: { type: String, required: true, ref: 'User' },
        lastReadAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);
ConversationReadSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

export const ConversationReadModel = mongoose.model('ConversationRead', ConversationReadSchema);
