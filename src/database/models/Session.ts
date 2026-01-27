import mongoose, { Schema } from 'mongoose';

const VerifySessionSchema = new Schema(
    {
        userId: { type: String, required: true },
        token: { type: String },
        email: { type: String },
        otp: { type: String },
        metadata: { type: Schema.Types.Mixed },
    },
    {
        timestamps: true,
        expires: 600, // 10 minutes TTL
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

export const VerifySessionModel = mongoose.model('VerifySession', VerifySessionSchema);
