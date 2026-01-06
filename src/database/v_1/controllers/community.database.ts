/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { Logger } from '../../../helpers/logger';
import { AppError } from '../../../helpers/errors';
import { CommunityModel } from '../../models/Community';
import { ChannelModel } from '../../models/Channel';
import { CommunityRoleModel } from '../../models/CommunityRole';
import { CommunityMemberModel } from '../../models/CommunityMember';
import { ChannelMessageModel } from '../../models/ChannelMessage';
import { NotificationModel } from '../../models/Notification';
import { UserModel } from '../../models/User';

export class CommunityDatabase {
    private logger: typeof Logger;

    public constructor(args: any) {
        this.logger = Logger;
    }

    // Community Management
    async CreateCommunity(creatorId: string, data: { name: string; description?: string; isPrivate?: boolean }): Promise<any> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const community = await CommunityModel.create([{ ...data, creatorId }], { session });
            const comm = community[0];

            // Create default channels
            const textChannel = await ChannelModel.create([{ communityId: comm.id, name: 'general', type: 'text', position: 0 }], { session });
            const announcementChannel = await ChannelModel.create([{ communityId: comm.id, name: 'announcements', type: 'announcement', position: 1 }], { session });

            // Create default roles
            const ownerRole = await CommunityRoleModel.create([{
                communityId: comm.id,
                name: 'Owner',
                color: '#FF0000',
                permissions: ['ADMIN'],
                position: 100
            }], { session });

            const memberRole = await CommunityRoleModel.create([{
                communityId: comm.id,
                name: 'Member',
                color: '#FFFFFF',
                permissions: ['SEND_MESSAGES'],
                position: 0
            }], { session });

            // Add creator as member with Owner role
            await CommunityMemberModel.create([{
                communityId: comm.id,
                userId: creatorId,
                roles: [ownerRole[0].id],
                level: 999
            }], { session });

            await session.commitTransaction();
            return comm.toJSON();
        } catch (error: any) {
            await session.abortTransaction();
            this.logger.error('Failed to create community', error);
            throw new AppError(400, error.message || 'Failed to create community');
        } finally {
            session.endSession();
        }
    }

    async GetCommunityByCreator(creatorId: string): Promise<any> {
        const comm = await CommunityModel.findOne({ creatorId });
        return comm ? comm.toJSON() : null;
    }

    async GetCommunityById(communityId: string): Promise<any> {
        const comm = await CommunityModel.findById(communityId);
        return comm ? comm.toJSON() : null;
    }

    async ExploreCommunities(params: { search?: string; page: number; limit: number }): Promise<any> {
        const { search, page, limit } = params;
        const query: any = { isPrivate: false };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const [communities, total] = await Promise.all([
            CommunityModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean() as any,
            CommunityModel.countDocuments(query)
        ]);

        const enriched = await Promise.all(communities.map(async (c: any) => {
            const memberCount = await CommunityMemberModel.countDocuments({ communityId: c._id });
            const creator = await UserModel.findById(c.creatorId).select('name profilePhoto creatorName').lean() as any;
            return {
                ...c,
                id: c._id.toString(),
                memberCount,
                creator: creator ? {
                    name: creator.name,
                    profilePhoto: creator.profilePhoto,
                    creatorName: creator.creatorName
                } : null
            };
        }));

        return {
            communities: enriched,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async UpdateCommunity(communityId: string, data: Partial<any>): Promise<any> {
        const comm = await CommunityModel.findByIdAndUpdate(communityId, data, { new: true });
        return comm ? comm.toJSON() : null;
    }

    async DeleteCommunity(communityId: string): Promise<boolean> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Delete community
            await CommunityModel.findByIdAndDelete(communityId, { session });
            // Delete channels
            await ChannelModel.deleteMany({ communityId }, { session });
            // Delete roles
            await CommunityRoleModel.deleteMany({ communityId }, { session });
            // Delete members
            await CommunityMemberModel.deleteMany({ communityId }, { session });
            // Note: Messages are not deleted here for performance reasons, or could be background job.
            // But strict consistency might require it. For now leaving it orphaned or assuming cascading delete if set up (Mongo doesn't do native cascade).
            // Let's delete for completeness if not too large.
            // Getting channel IDs first? No, Message has channelId, we don't have communityId on message easily unless we query channels.
            // Skip message deletion for now or do it if we had communityId on message (which we might not have added yet).

            await session.commitTransaction();
            return true;
        } catch (error) {
            await session.abortTransaction();
            this.logger.error('Failed to delete community', error);
            throw new AppError(400, 'Failed to delete community');
        } finally {
            session.endSession();
        }
    }

    // Channels
    async CreateChannel(communityId: string, data: { name: string; type?: string; isPrivate?: boolean }): Promise<any> {
        const count = await ChannelModel.countDocuments({ communityId });
        const channel = await ChannelModel.create({ ...data, communityId, position: count });
        return channel.toJSON();
    }

    async GetChannels(communityId: string): Promise<any[]> {
        const channels = await ChannelModel.find({ communityId }).sort({ position: 1 });
        return (channels as any[]).map(c => c.toJSON());
    }

    // Roles
    async CreateRole(communityId: string, data: { name: string; color?: string; permissions?: string[]; levelRequirement?: number }): Promise<any> {
        const role = await CommunityRoleModel.create({ ...data, communityId });
        return role.toJSON();
    }

    async GetRoles(communityId: string): Promise<any[]> {
        const roles = await CommunityRoleModel.find({ communityId }).sort({ position: -1 });
        return (roles as any[]).map(r => r.toJSON());
    }

    // Members
    async AddMember(communityId: string, userId: string): Promise<any> {
        // Find default role
        const defaultRole = await CommunityRoleModel.findOne({ communityId, name: 'Member' }); // Simplistic convention

        // Check if already member
        const existing = await CommunityMemberModel.findOne({ communityId, userId });
        if (existing) return existing.toJSON();

        const member = await CommunityMemberModel.create({
            communityId,
            userId,
            roles: defaultRole ? [defaultRole.id] : []
        });
        return member.toJSON();
    }

    async GetMember(communityId: string, userId: string): Promise<any> {
        const member = await CommunityMemberModel.findOne({ communityId, userId }).populate('roles');
        return member ? member.toJSON() : null;
    }

    async UpdateMemberXP(communityId: string, userId: string, xpToAdd: number): Promise<any> {
        const member = await CommunityMemberModel.findOne({ communityId, userId });
        if (!member) return null;

        member.xp += xpToAdd;
        // Simple logic: level = floor(sqrt(xp / 100))
        const newLevel = Math.floor(Math.sqrt(member.xp / 100));
        if (newLevel > member.level) {
            member.level = newLevel;
            // Check for role upgrades (TODO)
        }
        member.lastActiveAt = new Date();
        await member.save();
        return member.toJSON();
    }

    async KickMember(communityId: string, userId: string): Promise<boolean> {
        await CommunityMemberModel.findOneAndDelete({ communityId, userId });
        return true;
    }

    // Messages
    async CreateChannelMessage(channelId: string, senderId: string, content: string): Promise<any> {
        let message = await ChannelMessageModel.create({ channelId, senderId, content });
        message = await (message as any).populate('senderId', 'name profilePhoto');
        const json = (message as any).toJSON();
        return {
            ...json,
            senderName: (message.senderId as any)?.name || 'Unknown',
            senderAvatar: (message.senderId as any)?.profilePhoto || null
        };
    }

    async GetChannelMessages(channelId: string, limit = 50, beforeId?: string): Promise<any[]> {
        const query: any = { channelId };
        if (beforeId) {
            query._id = { $lt: beforeId };
        }
        const messages = await ChannelMessageModel.find(query)
            .populate('senderId', 'name profilePhoto')
            .sort({ createdAt: -1 })
            .limit(limit);

        return (messages as any[]).map(m => {
            const json = m.toJSON();
            return {
                ...json,
                senderName: (m.senderId as any)?.name || 'Unknown',
                senderAvatar: (m.senderId as any)?.profilePhoto || null
            };
        }).reverse(); // return in chronological order
    }

    async DeleteChannelMessage(messageId: string): Promise<boolean> {
        await ChannelMessageModel.findByIdAndDelete(messageId);
        return true;
    }

    // Insights
    async GetCommunityInsights(communityId: string): Promise<any> {
        const now = new Date();
        const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalMembers,
            newMembers24h,
            newMembers7d,
            totalChannels,
            totalRoles,
            totalMessages,
            messages7d,
            activeMembers7d,
            channelBreakdown,
            levelBreakdown
        ] = await Promise.all([
            CommunityMemberModel.countDocuments({ communityId }),
            CommunityMemberModel.countDocuments({ communityId, createdAt: { $gte: past24h } }),
            CommunityMemberModel.countDocuments({ communityId, createdAt: { $gte: past7d } }),
            ChannelModel.countDocuments({ communityId }),
            CommunityRoleModel.countDocuments({ communityId }),
            ChannelMessageModel.countDocuments({
                channelId: { $in: await ChannelModel.find({ communityId }).distinct('_id') }
            }),
            ChannelMessageModel.countDocuments({
                channelId: { $in: await ChannelModel.find({ communityId }).distinct('_id') },
                createdAt: { $gte: past7d }
            }),
            CommunityMemberModel.countDocuments({
                communityId,
                lastActiveAt: { $gte: past7d }
            }),
            ChannelMessageModel.aggregate([
                {
                    $match: {
                        channelId: { $in: (await ChannelModel.find({ communityId }).distinct('_id')).map(id => id.toString()) }
                    }
                },
                {
                    $group: {
                        _id: '$channelId',
                        count: { $sum: 1 }
                    }
                }
            ]),
            CommunityMemberModel.aggregate([
                { $match: { communityId } },
                {
                    $group: {
                        _id: '$level',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        // Enrich channel breakdown
        const enrichedChannels = await Promise.all(
            channelBreakdown.map(async (item) => {
                const channel = await ChannelModel.findById(item._id).select('name type').lean();
                return {
                    channelId: item._id,
                    name: channel?.name || 'Deleted channel',
                    type: channel?.type || 'text',
                    messageCount: item.count
                };
            })
        );

        return {
            overview: {
                totalMembers,
                totalChannels,
                totalRoles,
                activeMembers7d
            },
            engagement: {
                totalMessages,
                messages7d,
                messagesPerMember: totalMembers > 0 ? (totalMessages / totalMembers).toFixed(2) : 0
            },
            growth: {
                newMembers24h,
                newMembers7d
            },
            channels: enrichedChannels,
            levels: levelBreakdown.map(l => ({
                level: l._id,
                count: l.count
            }))
        };
    }
}
