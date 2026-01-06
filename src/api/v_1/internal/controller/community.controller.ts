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
            const { name, type, isPrivate } = req.body;

            // Permission check
            const comm = await db.v1.Community.GetCommunityById(communityId);
            if (!comm || comm.creatorId !== userId) {
                // TODO: Check for admin roles
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            const channel = await db.v1.Community.CreateChannel(communityId, { name, type, isPrivate });
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
            const { communityId } = req.params;
            // TODO: Filter based on user roles/access
            const channels = await db.v1.Community.GetChannels(communityId);
            body = { data: channels };
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
}
