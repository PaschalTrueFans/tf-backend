import mongoose, { Schema } from 'mongoose';
import { Entities } from '../../helpers';

const SystemNotificationSchema = new Schema(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        adminId: { type: String, ref: 'User' },
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

export const SystemNotificationModel = mongoose.model<Entities.SystemNotification>('SystemNotification', SystemNotificationSchema as any);

const TicketCommentSchema = new Schema(
    {
        ticketId: { type: String, required: true, ref: 'Ticket' },
        adminId: { type: String, ref: 'User' },
        comment: { type: String, required: true },
    },
    { timestamps: true }
);

export const TicketCommentModel = mongoose.model('TicketComment', TicketCommentSchema);


const TicketSchema = new Schema(
    {
        userId: { type: String, required: true, ref: 'User' },
        subject: { type: String, required: true },
        message: { type: String, required: true },
        status: { type: String, default: 'open' },
        // Comments will be separate collection or virtual populate
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

export const TicketModel = mongoose.model<Entities.Ticket>('Ticket', TicketSchema as any);

const EmailBroadcastSchema = new Schema(
    {
        subject: { type: String, required: true },
        message: { type: String, required: true },
        adminId: { type: String, ref: 'User' },
        recipientCount: { type: Number, default: 0 },
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

export const EmailBroadcastModel = mongoose.model('EmailBroadcast', EmailBroadcastSchema);

const SettingsSchema = new Schema(
    {
        platformFee: { type: String }, // e.g. "5%"
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
        }
    }
);

export const SettingsModel = mongoose.model('Settings', SettingsSchema);

const AdminSchema = new Schema(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        name: { type: String },
        role: { type: String, default: 'admin' },
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
        }
    }
);

export const AdminModel = mongoose.model<Entities.Admin>('Admin', AdminSchema as any);
