import mongoose, { Schema } from 'mongoose';

const CommunityReportSchema = new Schema(
    {
        communityId: { type: String, required: true, ref: 'Community' },
        reporterId: { type: String, required: true, ref: 'User' },
        targetId: { type: String, required: true }, // MessageID or UserID
        targetType: { type: String, enum: ['message', 'member'], required: true },
        reason: { type: String, required: true },
        status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
        resolutionNotes: { type: String }
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

export const CommunityReportModel = mongoose.model('CommunityReport', CommunityReportSchema);
