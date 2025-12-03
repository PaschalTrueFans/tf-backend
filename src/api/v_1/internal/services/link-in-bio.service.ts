import { Logger } from '../../../../helpers/logger';
import { AppError } from '../../../../helpers/errors';
import { Db } from '../../../../database/db';

export class LinkInBioService {
  private logger: typeof Logger;

  private db: Db;

  public constructor(args: { db: Db }) {
    this.logger = Logger;
    this.db = args.db;
  }

  async GetOrCreateProfile(userId: string) {
    this.logger.info('Service.LinkInBio.GetOrCreateProfile', { userId });

    try {
      const profile = await this.db.v1.LinkInBio.GetOrCreateProfile(userId);
      return this.formatProfileResponse(profile);
    } catch (error) {
      this.logger.error('GetOrCreateProfile error', error);
      throw error;
    }
  }

  async GetPublicProfile(username: string) {
    this.logger.info('Service.LinkInBio.GetPublicProfile', { username });

    try {
      const profile = await this.db.v1.LinkInBio.GetPublicProfileByUsername(username);
      return this.formatProfileResponse(profile);
    } catch (error) {
      this.logger.error('GetPublicProfile error', error);
      throw error;
    }
  }

  async GetMyProfile(userId: string) {
    this.logger.info('Service.LinkInBio.GetMyProfile', { userId });

    try {
      const profile = await this.db.v1.LinkInBio.GetMyProfile(userId);
      return this.formatProfileResponse(profile);
    } catch (error) {
      this.logger.error('GetMyProfile error', error);
      throw error;
    }
  }

  async UpdateProfile(userId: string, profileData: any) {
    this.logger.info('Service.LinkInBio.UpdateProfile', { userId });

    try {
      const {
        displayName,
        profileImage,
        coverImage,
        bio,
        theme,
        background,
        customColors,
        customFont,
        links,
        socialLinks,
        showLatestPosts,
        isPublished,
        seoTitle,
        seoDescription,
      } = profileData;

      const updateData = {
        display_name: displayName,
        profile_image: profileImage,
        cover_image: coverImage,
        bio,
        theme,
        background_type: background?.type,
        background_value: background?.value,
        custom_colors: customColors,
        custom_font: customFont,
        show_latest_posts: showLatestPosts,
        is_published: isPublished,
        seo_title: seoTitle,
        seo_description: seoDescription,
      };

      const profile = await this.db.v1.LinkInBio.UpsertProfile(userId, updateData, links || [], socialLinks || {});

      return this.formatProfileResponse(profile);
    } catch (error) {
      this.logger.error('UpdateProfile error', error);
      throw error;
    }
  }

  async TrackView(username: string, ip: string, userAgent: string, deviceType?: string, referrer?: string) {
    this.logger.info('Service.LinkInBio.TrackView', { username });

    try {
      const profileId = await this.db.v1.LinkInBio.GetProfileIdByUsername(username);

      await this.db.v1.LinkInBio.TrackView(profileId, {
        ip_address: ip,
        user_agent: userAgent,
        device_type: deviceType,
        country_code: null, // TODO: Can be enhanced with GeoIP service
        referrer,
      });
    } catch (error) {
      this.logger.error('TrackView error', error);
      // Don't throw for tracking failures
    }
  }

  async TrackClick(linkId: string, username: string, ip: string, userAgent: string, deviceType?: string, referrer?: string) {
    this.logger.info('Service.LinkInBio.TrackClick', { linkId, username });

    try {
      const profileId = await this.db.v1.LinkInBio.GetProfileIdByUsername(username);
      const link = await this.db.v1.LinkInBio.GetLinkById(linkId);

      if (link.profile_id !== profileId) {
        throw new AppError(400, 'Link does not belong to this profile');
      }

      await this.db.v1.LinkInBio.TrackClick(linkId, profileId, {
        ip_address: ip,
        user_agent: userAgent,
        device_type: deviceType,
        country_code: null, // TODO: Can be enhanced with GeoIP service
        referrer,
      });
    } catch (error) {
      this.logger.error('TrackClick error', error);
      // Don't throw for tracking failures
    }
  }

  async GetAnalytics(userId: string, startDate?: Date, endDate?: Date) {
    this.logger.info('Service.LinkInBio.GetAnalytics', { userId });

    try {
      const analytics = await this.db.v1.LinkInBio.GetAnalytics(userId, startDate, endDate);
      return analytics;
    } catch (error) {
      this.logger.error('GetAnalytics error', error);
      throw error;
    }
  }

  async PublishProfile(userId: string, isPublished: boolean) {
    this.logger.info('Service.LinkInBio.PublishProfile', { userId, isPublished });

    try {
      const profile = await this.db.v1.LinkInBio.SetPublished(userId, isPublished);
      return {
        isPublished: profile.is_published,
        publishedAt: profile.updatedAt,
      };
    } catch (error) {
      this.logger.error('PublishProfile error', error);
      throw error;
    }
  }

  async GetProfileByCustomSlug(slug: string) {
    this.logger.info('Service.LinkInBio.GetProfileByCustomSlug', { slug });

    try {
      const profile = await this.db.v1.LinkInBio.GetProfileByCustomSlug(slug);
      return this.formatProfileResponse(profile);
    } catch (error) {
      this.logger.error('GetProfileByCustomSlug error', error);
      throw error;
    }
  }

  async SyncUserProfileData(userId: string, userData: any) {
    this.logger.info('Service.LinkInBio.SyncUserProfileData', { userId });

    try {
      await this.db.v1.LinkInBio.SyncUserProfileData(userId, userData);
    } catch (error) {
      this.logger.error('SyncUserProfileData error', error);
      // Don't throw for sync failures
    }
  }

  private formatProfileResponse(profile: any) {
    return {
      userId: profile.user_id,
      username: profile.username,
      displayName: profile.display_name,
      profileImage: profile.profile_image,
      coverImage: profile.cover_image,
      bio: profile.bio,
      theme: profile.theme,
      background: {
        type: profile.background_type,
        value: profile.background_value,
      },
      customColors: profile.custom_colors,
      customFont: profile.custom_font,
      links: profile.links || [],
      socialLinks: profile.social_links,
      showLatestPosts: profile.show_latest_posts,
      analytics: {
        totalViews: profile.total_views || 0,
        totalClicks: profile.total_clicks || 0,
      },
      isPublished: profile.is_published,
      customSlug: profile.custom_slug,
      seoTitle: profile.seo_title,
      seoDescription: profile.seo_description,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
