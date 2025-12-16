import mongoose, { Schema } from 'mongoose';

import { Entities } from '../../helpers';

const LinkSchema = new Schema({
    type: { type: String, default: 'standard' },
    title: { type: String },
    url: { type: String },
    icon: { type: String },
    isActive: { type: Boolean, default: true },
    scheduledStart: { type: Date },
    scheduledEnd: { type: Date },
    orderIndex: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    customStyles: { type: Schema.Types.Mixed },
    platform: { type: String },
    embedCode: { type: String },
    postId: { type: String },
    thumbnail: { type: String },
    productId: { type: String },
});

const SocialLinksSchema = new Schema({
    instagram: { type: String },
    twitter: { type: String },
    youtube: { type: String },
    facebook: { type: String },
    tiktok: { type: String },
    linkedin: { type: String },
    website: { type: String },
    email: { type: String },
    whatsapp: { type: String },
}, { _id: false });

const LinkInBioProfileSchema = new Schema<any>(
    {
        userId: { type: String, required: true, unique: true, ref: 'User' },
        username: { type: String, required: true }, // indexed below
        displayName: { type: String },
        profileImage: { type: String },
        coverImage: { type: String },
        bio: { type: String },
        theme: { type: String, default: 'true-fans' },

        // Background settings
        backgroundType: { type: String, default: 'gradient' },
        backgroundValue: { type: String },

        // Custom colors and font
        customColors: { type: Schema.Types.Mixed },
        customFont: { type: String },

        // Features
        showLatestPosts: { type: Boolean, default: true },

        // Publishing
        isPublished: { type: Boolean, default: false },
        customSlug: { type: String, unique: true, sparse: true },

        // SEO
        seoTitle: { type: String },
        seoDescription: { type: String },

        // Embedded contents
        links: [LinkSchema],
        socialLinks: { type: SocialLinksSchema, default: {} },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                if (ret.links) {
                    ret.links.forEach((l: any) => {
                        if (l._id) {
                            l.id = l._id.toString();
                            delete l._id;
                        }
                    });
                }
            },
        },
    }
) as any;

LinkInBioProfileSchema.index({ username: 1 });


export const LinkInBioProfileModel = mongoose.model('LinkInBioProfile', LinkInBioProfileSchema);
