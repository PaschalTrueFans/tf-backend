import mongoose, { Schema } from 'mongoose';

const LinkInBioViewSchema = new Schema(
    {
        profileId: { type: Schema.Types.ObjectId, required: true, ref: 'LinkInBioProfile' },
        ipAddress: { type: String },
        userAgent: { type: String },
        deviceType: { type: String },
        countryCode: { type: String },
        referrer: { type: String },
        viewedAt: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: 'viewedAt', updatedAt: false } }
);
LinkInBioViewSchema.index({ profileId: 1, viewedAt: 1 });
LinkInBioViewSchema.index({ profileId: 1, ipAddress: 1 }); // Rate limiting

const LinkInBioClickSchema = new Schema(
    {
        linkId: { type: Schema.Types.ObjectId, required: true }, // ID from embedded link
        profileId: { type: Schema.Types.ObjectId, required: true, ref: 'LinkInBioProfile' },
        ipAddress: { type: String },
        userAgent: { type: String },
        deviceType: { type: String },
        countryCode: { type: String },
        referrer: { type: String },
        clickedAt: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: 'clickedAt', updatedAt: false } }
);
LinkInBioClickSchema.index({ linkId: 1, clickedAt: 1 });
LinkInBioClickSchema.index({ linkId: 1, ipAddress: 1 }); // Rate limiting

export const LinkInBioViewModel = mongoose.model('LinkInBioView', LinkInBioViewSchema);
export const LinkInBioClickModel = mongoose.model('LinkInBioClick', LinkInBioClickSchema);
