/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';
import { LinkInBioProfileModel } from '../../models/LinkInBioProfile';
import { LinkInBioViewModel, LinkInBioClickModel } from '../../models/LinkInBioAnalytics';
import { UserModel } from '../../models/User';

export class LinkInBioDatabase {
  private logger: typeof Logger;

  public constructor(args: any) {
    this.logger = Logger;
  }

  // Get or create profile for user
  async GetOrCreateProfile(userId: string): Promise<any> {
    this.logger.info('Db.LinkInBio.GetOrCreateProfile', { userId });

    try {
      let profile = await LinkInBioProfileModel.findOne({ userId });

      if (profile) return profile.toJSON();

      // Create new profile
      const user = await UserModel.findById(userId);
      if (!user) throw new AppError(404, 'User not found');

      const username = user.pageName || user.email?.split('@')[0] || `user-${userId.slice(0, 8)}`;

      const defaultProfileData = {
        userId,
        username,
        displayName: user.name,
        profileImage: user.profilePhoto,
        bio: 'Welcome to my link-in-bio!',
        links: [{
          type: 'standard',
          title: 'Become my True Fan',
          url: 'https://www.truefans.ng',
          icon: '🌐',
          isActive: true,
          orderIndex: 0
        }]
      };

      profile = await LinkInBioProfileModel.create(defaultProfileData);
      return profile.toJSON();

    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('GetOrCreateProfile error', error);
      throw new AppError(500, 'Failed to get or create profile');
    }
  }

  // Get public profile by username
  async GetPublicProfileByUsername(username: string): Promise<any> {
    const lowercase_username = username.trim().toLocaleLowerCase();
    this.logger.info('Db.LinkInBio.GetPublicProfileByUsername', { lowercase_username });

    try {
      // First find the profile regardless of status to give better error messages
      const profile = await LinkInBioProfileModel.findOne({
        username: { $regex: new RegExp(`^${lowercase_username}$`, 'i') }
      });

      if (!profile) throw new AppError(404, 'Profile not found');
      // if (!profile.isPublished) throw new AppError(404, 'Profile is not public'); // DISABLED as per user request (always live)

      const profileObj = profile.toJSON();

      // Filter active links
      const now = new Date();
      profileObj.links = (profileObj.links || []).filter((l: any) =>
        l.isActive &&
        (!l.scheduledStart || new Date(l.scheduledStart) <= now) &&
        (!l.scheduledEnd || new Date(l.scheduledEnd) >= now)
      ).sort((a: any, b: any) => a.orderIndex - b.orderIndex) as any;

      // Get view/click counts
      const [totalViews, totalClicks] = await Promise.all([
        LinkInBioViewModel.countDocuments({ profileId: profileObj.id }),
        LinkInBioClickModel.countDocuments({ profileId: profileObj.id })
      ]);

      return { ...profileObj, total_views: totalViews, total_clicks: totalClicks };

    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('GetPublicProfileByUsername error', error);
      throw error;
    }
  }

  // Get profile with all links (for editing)
  async GetMyProfile(userId: string): Promise<any> {
    this.logger.info('Db.LinkInBio.GetMyProfile', { userId });

    try {
      let profile = await LinkInBioProfileModel.findOne({ userId });

      if (!profile) {
        return await this.GetOrCreateProfile(userId);
      }

      const profileObj = profile.toJSON();

      // Sort links
      if (profileObj.links) {
        profileObj.links.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
      }

      const [totalViews, totalClicks] = await Promise.all([
        LinkInBioViewModel.countDocuments({ profileId: profileObj.id }),
        LinkInBioClickModel.countDocuments({ profileId: profileObj.id })
      ]);

      return { ...profileObj, total_views: totalViews, total_clicks: totalClicks };

    } catch (error) {
      this.logger.error('GetMyProfile error', error);
      throw error;
    }
  }

  // Update or create profile
  async UpsertProfile(userId: string, profileData: any, linksData: any[], socialLinksData: any): Promise<any> {
    this.logger.info('Db.LinkInBio.UpsertProfile', { userId });

    try {
      // Ensure default link exists
      const links = linksData || [];
      const hasDefaultLink = links.some((l: any) => l.title === 'Become my True Fan');

      const processedLinks = [
        {
          type: 'standard',
          title: 'Become my True Fan',
          url: 'https://www.truefans.ng',
          icon: '🌐',
          isActive: true,
          orderIndex: 0
        },
        ...links.filter((l: any) => l.title !== 'Become my True Fan').map((l: any, i: number) => ({
          ...l,
          orderIndex: l.order ? l.order + 1 : i + 1,
          scheduledStart: l.scheduledStart,
          scheduledEnd: l.scheduledEnd,
          isActive: l.isActive !== false
        }))
      ];

      const updatePayload: any = { ...profileData, isPublished: true };
      if (linksData) updatePayload.links = processedLinks;
      if (socialLinksData) updatePayload.socialLinks = socialLinksData;

      // Handle username unique check logic if strictly needed, but Mongoose unique index handles it.
      // However upsert needs care.

      const profile = await LinkInBioProfileModel.findOneAndUpdate(
        { userId },
        { $set: updatePayload },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );

      return profile.toJSON();
    } catch (error) {
      this.logger.error('UpsertProfile error', error);
      throw new AppError(500, 'Failed to update profile');
    }
  }

  // Track view
  async TrackView(profileId: string, viewData: any): Promise<void> {
    try {
      // Rate limit check
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recent = await LinkInBioViewModel.findOne({
        profileId,
        ipAddress: viewData.ip_address,
        viewedAt: { $gt: fiveMinsAgo }
      });

      if (recent) return;

      await LinkInBioViewModel.create({
        profileId,
        ipAddress: viewData.ip_address,
        userAgent: viewData.user_agent,
        deviceType: viewData.device_type,
        countryCode: viewData.country_code,
        referrer: viewData.referrer
      });
    } catch (err) {
      this.logger.error('TrackView error', err);
    }
  }

  // Track click
  async TrackClick(linkId: string, profileId: string, clickData: any): Promise<void> {
    try {
      // Rate limit
      const oneMinAgo = new Date(Date.now() - 60 * 1000);
      const recent = await LinkInBioClickModel.findOne({
        linkId,
        ipAddress: clickData.ip_address,
        clickedAt: { $gt: oneMinAgo }
      });

      if (recent) return;

      await LinkInBioClickModel.create({
        linkId,
        profileId,
        ipAddress: clickData.ip_address,
        userAgent: clickData.user_agent,
        deviceType: clickData.device_type,
        countryCode: clickData.country_code,
        referrer: clickData.referrer
      });

      // Update click count on the link inside the profile
      await LinkInBioProfileModel.updateOne(
        { _id: profileId, 'links._id': linkId },
        { $inc: { 'links.$.clickCount': 1 } }
      );

    } catch (err) {
      this.logger.error('TrackClick error', err);
    }
  }

  // Get analytics
  async GetAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const profile = await LinkInBioProfileModel.findOne({ userId });
      if (!profile) throw new AppError(404, 'Profile not found');

      const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const [totalViews, totalClicks] = await Promise.all([
        LinkInBioViewModel.countDocuments({
          profileId: profile._id,
          viewedAt: { $gte: start, $lte: end }
        }),
        LinkInBioClickModel.countDocuments({
          profileId: profile._id,
          clickedAt: { $gte: start, $lte: end }
        })
      ]);

      // Clicks by link (Aggregation)
      const clicksByLinkRes = await LinkInBioClickModel.aggregate([
        { $match: { profileId: profile._id, clickedAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$linkId', count: { $sum: 1 } } }
      ]);
      const clicksByLink: Record<string, number> = {};
      clicksByLinkRes.forEach((c: any) => clicksByLink[c._id.toString()] = c.count);

      // Device breakdown
      const deviceRes = await LinkInBioClickModel.aggregate([
        { $match: { profileId: profile._id, clickedAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$deviceType', count: { $sum: 1 } } }
      ]);
      const deviceBreakdown: Record<string, number> = {};
      deviceRes.forEach((d: any) => { if (d._id) deviceBreakdown[d._id] = d.count });

      // Geo data
      const geoRes = await LinkInBioClickModel.aggregate([
        { $match: { profileId: profile._id, clickedAt: { $gte: start, $lte: end }, countryCode: { $ne: null } } },
        { $group: { _id: '$countryCode', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      const geoData: Record<string, number> = {};
      geoRes.forEach((g: any) => geoData[g._id] = g.count);

      // Referrer data
      const refRes = await LinkInBioClickModel.aggregate([
        { $match: { profileId: profile._id, clickedAt: { $gte: start, $lte: end }, referrer: { $ne: null } } },
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      const referrerData: Record<string, number> = {};
      refRes.forEach((r: any) => referrerData[r._id] = r.count);

      const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : 0;

      return {
        totalViews,
        totalClicks,
        clicksByLink,
        deviceBreakdown,
        geoData,
        referrerData,
        conversionRate
      };

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to fetch analytics');
    }
  }

  // Publish or unpublish profile
  async SetPublished(userId: string, isPublished: boolean): Promise<any> {
    try {
      let profile = await LinkInBioProfileModel.findOne({ userId });
      if (!profile && isPublished) {
        // Create if not exists and trying to publish
        // But GetOrCreate logic requires user info, simpler to call GetOrCreate
        await this.GetOrCreateProfile(userId);
        profile = await LinkInBioProfileModel.findOne({ userId });
      }

      if (profile && isPublished) {
        const hasActive = profile.links?.some((l: any) => l.isActive);
        if (!hasActive) throw new AppError(400, 'Must have at least 1 active link to publish');
      }

      const updated = await LinkInBioProfileModel.findOneAndUpdate(
        { userId },
        { isPublished },
        { new: true }
      );
      return updated?.toJSON();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw error;
    }
  }

  // Get profile by custom slug
  async GetProfileByCustomSlug(slug: string): Promise<any> {
    const profile = await LinkInBioProfileModel.findOne({ customSlug: slug, isPublished: true });
    if (!profile) throw new AppError(404, 'Profile not found');

    // ... logic to filter links and get stats similar to GetPublicProfile ...
    // For brevity assuming similar logic or reusing a helper if I could, but doing inline
    const profileObj = profile.toJSON();
    const now = new Date();
    profileObj.links = (profileObj.links || []).filter((l: any) =>
      l.isActive &&
      (!l.scheduledStart || new Date(l.scheduledStart) <= now) &&
      (!l.scheduledEnd || new Date(l.scheduledEnd) >= now)
    ).sort((a: any, b: any) => a.orderIndex - b.orderIndex) as any;

    return profileObj;
  }

  async GetProfileIdByUsername(username: string): Promise<string> {
    const profile = await LinkInBioProfileModel.findOne({ username, isPublished: true }).select('_id');
    if (!profile) throw new AppError(404, 'Profile not found');
    return profile._id.toString();
  }

  async GetLinkById(linkId: string): Promise<any> {
    // Link is embedded, so we find profile with this link
    const profile = await LinkInBioProfileModel.findOne({ 'links._id': linkId }, { 'links.$': 1 });
    if (!profile || !profile.links || profile.links.length === 0) throw new AppError(404, 'Link not found');
    const link = profile.links[0];
    return { ...link, id: link._id.toString() }; // toJSON transform might not run on embedded extraction directly
  }

  async SyncUserProfileData(userId: string, userData: any): Promise<void> {
    try {
      const updateData: any = {};
      if (userData.profilePhoto) updateData.profileImage = userData.profilePhoto;
      if (userData.coverPhoto) updateData.coverImage = userData.coverPhoto;
      if (userData.bio) updateData.bio = userData.bio;
      if (userData.name) updateData.displayName = userData.name;
      if (userData.pageName) updateData.username = userData.pageName;

      if (Object.keys(updateData).length > 0) {
        await LinkInBioProfileModel.updateOne({ userId }, updateData);
      }
    } catch (err) {
      this.logger.error('SyncUserProfileData error', err);
    }
  }
}
