import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User' },
        type: { type: String, required: true }, // 'community_mention', 'community_message', 'level_up', etc.
        title: { type: String },
        message: { type: String },
        data: { type: Schema.Types.Mixed }, // flexible payload
        isRead: { type: Boolean, default: false },
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

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export const NotificationModel = mongoose.model('Notification', NotificationSchema);
