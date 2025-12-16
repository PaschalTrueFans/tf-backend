import mongoose, { Schema } from 'mongoose';
import { Entities } from '../../helpers';

const UserSchema = new Schema(
    {
        email: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        password: { type: String },
        pageName: { type: String, unique: true, sparse: true },
        creatorName: { type: String },
        is18Plus: { type: Boolean, default: false },
        profilePhoto: { type: String },
        bio: { type: String },
        coverPhoto: { type: String },
        introVideo: { type: String },
        themeColor: { type: String },
        socialLinks: { type: Schema.Types.Mixed }, // JSON field
        tags: [{ type: String }],
        categoryId: { type: String },
        isVerified: { type: Boolean, default: false },
        isBlocked: { type: Boolean, default: false },
        role: { type: String, enum: ['creator', 'member'], default: 'member' },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                delete ret.password;
            },
        },
        toObject: { virtuals: true },
    }
);

// Virtual for id to match SQL uuid behavior interface
UserSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

export const UserModel = mongoose.model<Entities.User>('User', UserSchema as any);
