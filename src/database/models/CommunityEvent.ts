import mongoose, { Schema } from 'mongoose';

const CommunityEventSchema = new Schema(
    {
        communityId: { type: String, required: true, ref: 'Community' },
        creatorId: { type: String, required: true, ref: 'User' },
        title: { type: String, required: true },
        description: { type: String },
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        location: { type: String }, // 'Live Stage', 'External Link', 'IRL'
        link: { type: String },

        // RSVP Counters
        goingCount: { type: Number, default: 0 },
        interestedCount: { type: Number, default: 0 },
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

export const CommunityEventModel = mongoose.model('CommunityEvent', CommunityEventSchema);

const EventRSVPSchema = new Schema(
    {
        eventId: { type: String, required: true, ref: 'CommunityEvent' },
        userId: { type: String, required: true, ref: 'User' },
        status: { type: String, enum: ['going', 'interested', 'not_going'], required: true }
    },
    { timestamps: true }
);

EventRSVPSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export const EventRSVPModel = mongoose.model('EventRSVP', EventRSVPSchema);
