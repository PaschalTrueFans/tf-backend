import mongoose, { Schema } from 'mongoose';

const PollSchema = new Schema(
    {
        channelId: { type: String, required: true, ref: 'Channel' },
        creatorId: { type: String, required: true, ref: 'User' },
        question: { type: String, required: true },
        options: [{
            id: { type: String, required: true },
            text: { type: String, required: true },
            voteCount: { type: Number, default: 0 }
        }],
        endsAt: { type: Date },
        isMultipleChoice: { type: Boolean, default: false },
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

export const PollModel = mongoose.model('Poll', PollSchema);

const PollVoteSchema = new Schema(
    {
        pollId: { type: String, required: true, ref: 'Poll' },
        userId: { type: String, required: true, ref: 'User' },
        optionId: { type: String, required: true }
    },
    {
        timestamps: true
    }
);

PollVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

export const PollVoteModel = mongoose.model('PollVote', PollVoteSchema);
