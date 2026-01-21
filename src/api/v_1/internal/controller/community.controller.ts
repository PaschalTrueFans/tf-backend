import { Request, Response } from 'express';
import { Db } from '../../../../database/db';
import { genericError } from '../../../../helpers/utils';

export class CommunityController {

    // Community
    public exploreCommunities = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const { search, page, limit } = req.query as any;

            const result = await db.v1.Community.ExploreCommunities({
                search,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            });

            body = { data: result };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public createCommunity = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { name, description, isPrivate, icon, banner } = req.body;

            const community = await db.v1.Community.CreateCommunity(userId, { name, description, isPrivate });

            // If icon/banner provided, update (skipping complicated upload logic for now, assuming URL passed or handled elsewhere)
            if (icon || banner) {
                await db.v1.Community.UpdateCommunity(community.id, { icon, banner });
            }

            body = { data: community };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public getMyCommunity = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const community = await db.v1.Community.GetCommunityByCreator(userId);
            body = { data: community };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public getJoinedCommunities = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const communities = await db.v1.Community.GetJoinedCommunities(userId);
            body = { data: communities };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public getCommunity = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const { communityId } = req.params;
            const community = await db.v1.Community.GetCommunityById(communityId);
            body = { data: community };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public updateCommunity = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;

            // Permission check (basic)
            const comm = await db.v1.Community.GetCommunityById(communityId);
            if (!comm || comm.creatorId !== userId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            const updated = await db.v1.Community.UpdateCommunity(communityId, req.body);
            body = { data: updated };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public deleteCommunity = async (req: Request, res: Response): Promise<void> => {
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;

            const comm = await db.v1.Community.GetCommunityById(communityId);
            if (!comm || comm.creatorId !== userId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            await db.v1.Community.DeleteCommunity(communityId);
            res.json({ success: true });
        } catch (error) {
            genericError(error, res);
        }
    };

    // Channels
    public createChannel = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;
            const { name, type, isPrivate, allowedMembershipIds } = req.body;
            const requiredTier = req.body.requiredTier ? Number(req.body.requiredTier) : 0;

            // Permission check
            const comm = await db.v1.Community.GetCommunityById(communityId);
            if (!comm || comm.creatorId !== userId) {
                // TODO: Check for admin roles
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            const channel = await db.v1.Community.CreateChannel(communityId, { name, type, isPrivate, allowedMembershipIds, requiredTier });
            body = { data: channel };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public getChannels = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;

            const community = await db.v1.Community.GetCommunityById(communityId);
            if (!community) {
                res.status(404).json({ error: 'Community not found' });
                return;
            }

            const channels = await db.v1.Community.GetChannels(communityId);

            // If user is creator, show all
            if (community.creatorId === userId) {
                body = { data: channels };
            } else {
                // Get user's active subscription for this creator
                const subscription = await db.v1.User.GetSubscriptionByUserAndCreator(userId, community.creatorId);
                const userMembershipId = subscription ? subscription.membershipId : null;

                let userTier = 0;
                if (userMembershipId) {
                    const membership = await db.v1.User.GetMembershipById(userMembershipId);
                    userTier = membership?.tier || 1;
                }

                // Filter channels
                const filteredChannels = channels.filter((channel: any) => {
                    const requiredTier = channel.requiredTier || 0;

                    // 1. Level 0 (Public)
                    if (requiredTier === 0 && (!channel.allowedMembershipIds || channel.allowedMembershipIds.length === 0)) {
                        return true;
                    }

                    // Must be a subscriber for any level above 0 or if IDs are specified
                    if (!userMembershipId) return false;

                    // 2. Hierarchical Tier Check
                    if (requiredTier > 0 && userTier >= requiredTier) return true;

                    // 3. Specific ID Check (Legacy/Manual)
                    if (channel.allowedMembershipIds && channel.allowedMembershipIds.includes(userMembershipId)) {
                        return true;
                    }

                    return false;
                });

                body = { data: filteredChannels };
            }
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public getChannelMessages = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const { channelId } = req.params;
            const { limit, beforeId } = req.query as any;

            const messages = await db.v1.Community.GetChannelMessages(channelId, parseInt(limit) || 50, beforeId);
            body = { data: messages };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public createChannelMessage = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId, channelId } = req.params;
            const { content } = req.body;

            // Basic Permission Check: Must be a member of the community
            // Ideally check for 'SEND_MESSAGES' role permission, but membership is a good baseline start.
            const member = await db.v1.Community.GetMember(communityId, userId);
            if (!member) {
                res.status(403).json({ error: 'You must be a member of this community to send messages.' });
                return;
            }

            const message = await db.v1.Community.CreateChannelMessage(channelId, userId, content);
            body = { data: message };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    // Members
    public joinCommunity = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;

            const member = await db.v1.Community.AddMember(communityId, userId);
            body = { data: member };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public leaveCommunity = async (req: Request, res: Response): Promise<void> => {
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;

            await db.v1.Community.KickMember(communityId, userId);
            res.json({ success: true, message: 'You have left the community' });
        } catch (error) {
            genericError(error, res);
        }
    };

    public getMyMember = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;

            const member = await db.v1.Community.GetMember(communityId, userId);
            body = { data: member };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    // Roles
    public createRole = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;
            const { name, color, permissions } = req.body;

            // Permission check
            const comm = await db.v1.Community.GetCommunityById(communityId);
            if (!comm || comm.creatorId !== userId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            const role = await db.v1.Community.CreateRole(communityId, { name, color, permissions });
            body = { data: role };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public getRoles = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const { communityId } = req.params;
            const roles = await db.v1.Community.GetRoles(communityId);
            body = { data: roles };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public deleteMessage = async (req: Request, res: Response): Promise<void> => {
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId, messageId } = req.params;

            // Check if requester is creator (moderator)
            const comm = await db.v1.Community.GetCommunityById(communityId);
            if (!comm || comm.creatorId !== userId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }
            // Ideally we also check if user is the sender, but for moderation 'delete' usually means admin delete.
            // Self-delete logic would require checking message sender. Assuming this is admin moderation.

            await db.v1.Community.DeleteChannelMessage(messageId);
            res.json({ success: true });
        } catch (error) {
            genericError(error, res);
        }
    };

    public kickMember = async (req: Request, res: Response): Promise<void> => {
        try {
            const db = res.locals.db as Db;
            const userId = req.userId; // Requesting user
            const { communityId, memberId } = req.params; // memberId is target userId

            // Check permissions (only creator for now)
            const comm = await db.v1.Community.GetCommunityById(communityId);
            if (!comm || comm.creatorId !== userId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            await db.v1.Community.KickMember(communityId, memberId);
            res.json({ success: true });
        } catch (error) {
            genericError(error, res);
        }
    };

    public getCommunityInsights = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;

            // Permission check: Only the creator can view full community insights
            const community = await db.v1.Community.GetCommunityById(communityId);
            if (!community || community.creatorId !== userId) {
                res.status(403).json({ error: 'Only the community creator can access insights' });
                return;
            }

            const insights = await db.v1.Community.GetCommunityInsights(communityId);
            body = { data: insights };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    // Polls
    public createPoll = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId, channelId } = req.params;
            const { question, options, endsAt } = req.body;

            // TODO: Permission Check

            const poll = await db.v1.Community.CreatePoll({
                channelId,
                creatorId: userId,
                question,
                options,
                endsAt
            });
            body = { data: poll };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public votePoll = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId, pollId } = req.params;
            const { optionId } = req.body;

            const poll = await db.v1.Community.VotePoll(pollId, userId, optionId);
            body = { data: poll };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public getPoll = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const { pollId } = req.params;
            const poll = await db.v1.Community.GetPoll(pollId);
            if (!poll) {
                res.status(404).json({ error: 'Poll not found' });
                return;
            }
            body = { data: poll };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    // Events
    public createEvent = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;

            // TODO: Permission Check (Creator only)

            const event = await db.v1.Community.CreateEvent({
                communityId,
                creatorId: userId,
                ...req.body
            });
            body = { data: event };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public getEvents = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const { communityId } = req.params;
            const events = await db.v1.Community.GetEvents(communityId);
            body = { data: events };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public rsvpEvent = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId, eventId } = req.params;
            const { status } = req.body;

            const rsvp = await db.v1.Community.RSVPEvent(eventId, userId, status);
            body = { data: rsvp };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    // Reporting
    public reportContent = async (req: Request, res: Response): Promise<void> => {
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;
            const { targetId, targetType, reason } = req.body;

            await db.v1.Community.ReportContent({
                communityId,
                reporterId: userId,
                targetId,
                targetType,
                reason
            });
            res.json({ success: true, message: 'Report submitted' });
        } catch (error) {
            genericError(error, res);
        }
    };

    // Emojis
    public addEmoji = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const userId = req.userId;
            const { communityId } = req.params;

            // TODO: Permission Check

            const emoji = await db.v1.Community.AddEmoji(communityId, {
                uploadedBy: userId,
                ...req.body
            });
            body = { data: emoji };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };

    public getEmojis = async (req: Request, res: Response): Promise<void> => {
        let body;
        try {
            const db = res.locals.db as Db;
            const { communityId } = req.params;
            const emojis = await db.v1.Community.GetEmojis(communityId);
            body = { data: emojis };
        } catch (error) {
            genericError(error, res);
            return;
        }
        res.json(body);
    };
}
