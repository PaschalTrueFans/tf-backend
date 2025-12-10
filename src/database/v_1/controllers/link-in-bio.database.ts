/* eslint-disable @typescript-eslint/no-explicit-any */
import { Knex } from 'knex';
import { Entities } from '../../../helpers';
import { AppError } from '../../../helpers/errors';
import { Logger } from '../../../helpers/logger';
import { DatabaseErrors } from '../../../helpers/contants';

export class LinkInBioDatabase {
  private logger: typeof Logger;

  private GetKnex: () => Knex;

  private RunQuery: (query: Knex.QueryBuilder) => Promise<{ res?: any[]; err: any }>;

  public constructor(args: {
    GetKnex: () => Knex;
    RunQuery: (query: Knex.QueryBuilder) => Promise<{ res?: any[]; err: any }>;
  }) {
    this.logger = Logger;
    this.GetKnex = args.GetKnex;
    this.RunQuery = args.RunQuery;
  }

  // Get or create profile for user
  async GetOrCreateProfile(userId: string): Promise<any> {
    this.logger.info('Db.LinkInBio.GetOrCreateProfile', { userId });

    const knexdb = this.GetKnex();

    try {
      // Try to find existing profile
      const findQuery = knexdb('link_in_bio_profiles').where({ user_id: userId });
      {
        const { res: foundRes, err: foundErr } = await this.RunQuery(findQuery);
        if (foundErr) {
          this.logger.error('Failed to fetch profile', foundErr);
          throw new AppError(400, 'Failed to fetch profile');
        }
        if (foundRes && foundRes[0]) return foundRes[0];
      }

      // Need to create default profile. Get user info for defaults
      const userQuery = knexdb('users').where({ id: userId }).first();
      const { res: userRes, err: userErr } = await this.RunQuery(userQuery);
      if (userErr || !userRes) {
        throw new AppError(404, 'User not found');
      }
      const user = userRes as any;

      const defaultProfileData = {
        user_id: userId,
        username: user.pageName || (user.email ? user.email.split('@')[0] : `user-${userId.slice(0, 8)}`),
        display_name: user.name || null,
        profile_image: user.profilePhoto || null,
        bio: 'Welcome to my link-in-bio!',
        theme: 'true-fans',
        background_type: 'gradient',
        background_value: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)',
        show_latest_posts: true,
        is_published: false,
      };

      const insertQuery = knexdb('link_in_bio_profiles').insert(defaultProfileData).returning('*');
      const { res: insertRes, err: insertErr } = await this.RunQuery(insertQuery);
      if (insertErr) {
        // Possible concurrent insert created it — try to re-fetch
        const { res: reRes, err: reErr } = await this.RunQuery(findQuery);
        if (reErr || !reRes || !reRes[0]) {
          this.logger.error('Failed to create profile', insertErr);
          throw new AppError(400, 'Failed to create profile');
        }
        // ensure default links/social exist for the found profile
        const existing = reRes[0];
        await knexdb('link_in_bio_links').insert({
          profile_id: existing.id,
          type: 'standard',
          title: 'Become my True Fan',
          url: 'https://www.truefans.ng',
          icon: '🌐',
          is_active: true,
          order_index: 0,
          click_count: 0,
        }).catch(() => { });
        await knexdb('link_in_bio_social_links').insert({ profile_id: existing.id }).catch(() => { });
        return existing;
      }

      const newProfile = insertRes?.[0];

      // Insert default links and social links (ignore errors if they already exist)
      await knexdb('link_in_bio_links').insert({
        profile_id: newProfile.id,
        type: 'standard',
        title: 'Become my True Fan',
        url: 'https://www.truefans.ng',
        icon: '🌐',
        is_active: true,
        order_index: 0,
        click_count: 0,
      }).catch(() => { });

      await knexdb('link_in_bio_social_links').insert({ profile_id: newProfile.id }).catch(() => { });

      return newProfile;
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('GetOrCreateProfile error', error);
      throw new AppError(500, 'Failed to get or create profile');
    }
  }

  // Get public profile by username
  async GetPublicProfileByUsername(username: string): Promise<any> {
    const lowercase_username = username.toLocaleLowerCase()
    this.logger.info('Db.LinkInBio.GetPublicProfileByUsername', { lowercase_username });

    try {
      const knexdb = this.GetKnex();

      const query = knexdb.select(
        'p.*',
        knexdb.raw(
          `json_agg(
            json_build_object(
              'id', l.id,
              'type', l.type,
              'title', l.title,
              'url', l.url,
              'icon', l.icon,
              'clicks', l.click_count,
              'order', l.order_index,
              'customStyles', l.custom_styles,
              'platform', l.platform,
              'postId', l.post_id
            ) ORDER BY l.order_index
          ) FILTER (WHERE l.id IS NOT NULL) as links`
        ),
        knexdb.raw(
          `row_to_json(s) as social_links`
        ),
        knexdb.raw(
          `(SELECT COUNT(*) FROM link_in_bio_views WHERE profile_id = p.id)::INTEGER as total_views`
        ),
        knexdb.raw(
          `(SELECT COUNT(*) FROM link_in_bio_clicks WHERE profile_id = p.id)::INTEGER as total_clicks`
        )
      )
        .from('link_in_bio_profiles as p')
        .leftJoin('link_in_bio_links as l', (builder: any) => {
          builder
            .on('l.profile_id', '=', 'p.id')
            .on('l.is_active', '=', knexdb.raw('true'));
        })
        .leftJoin('link_in_bio_social_links as s', 's.profile_id', 'p.id')
        .whereRaw('(l.scheduled_start IS NULL OR l.scheduled_start <= NOW())')
        .andWhereRaw('(l.scheduled_end IS NULL OR l.scheduled_end >= NOW())')
        .andWhereRaw('LOWER(p.username) = ?', [lowercase_username])
        .andWhere('p.is_published', true)
        .groupBy('p.id', 's.id');

      const { res, err } = await this.RunQuery(query);

      if (err) {
        this.logger.error('Failed to fetch public profile', err);
        throw new AppError(400, 'Failed to fetch profile');
      }

      if (!res || res.length === 0) {
        throw new AppError(404, 'Profile not found');
      }

      return res[0];
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
      const knexdb = this.GetKnex();

      const query = knexdb.select(
        'p.*',
        knexdb.raw(
          `json_agg(
            json_build_object(
              'id', l.id,
              'type', l.type,
              'title', l.title,
              'url', l.url,
              'icon', l.icon,
              'clicks', l.click_count,
              'isActive', l.is_active,
              'order', l.order_index,
              'customStyles', l.custom_styles,
              'platform', l.platform,
              'scheduledStart', l.scheduled_start,
              'scheduledEnd', l.scheduled_end,
              'postId', l.post_id
            ) ORDER BY l.order_index
          ) FILTER (WHERE l.id IS NOT NULL) as links`
        ),
        knexdb.raw(
          `row_to_json(s) as social_links`
        ),
        knexdb.raw(
          `(SELECT COUNT(*) FROM link_in_bio_views WHERE profile_id = p.id)::INTEGER as total_views`
        ),
        knexdb.raw(
          `(SELECT COUNT(*) FROM link_in_bio_clicks WHERE profile_id = p.id)::INTEGER as total_clicks`
        )
      )
        .from(knexdb.raw('link_in_bio_profiles p'))
        .leftJoin('link_in_bio_links as l', 'l.profile_id', 'p.id')
        .leftJoin('link_in_bio_social_links as s', 's.profile_id', 'p.id')
        .where('p.user_id', userId)
        .groupBy('p.id', 's.id');

      const { res, err } = await this.RunQuery(query);

      if (err) {
        this.logger.error('Failed to fetch my profile', err);
        throw new AppError(400, 'Failed to fetch profile');
      }

      if (!res || res.length === 0) {
        // No profile exists — create default one
        const createdProfile = await this.GetOrCreateProfile(userId);
        if (!createdProfile || !createdProfile.id) {
          throw new AppError(400, 'Failed to create profile');
        }

        // Ensure social_links row exists for the profile
        const knexdb = this.GetKnex();
        await knexdb('link_in_bio_social_links')
          .insert({ profile_id: createdProfile.id })
          .onConflict('profile_id')
          .ignore();

        // Re-run the aggregated query to get the complete profile with links/social
        const { res: createdRes, err: createdErr } = await this.RunQuery(query);
        if (createdErr) {
          this.logger.error('Failed to fetch profile after creation', createdErr);
          throw new AppError(400, 'Failed to fetch profile');
        }

        if (!createdRes || createdRes.length === 0) {
          // If still no result, return basic profile from creation
          this.logger.info('Aggregated query returned empty after profile creation, returning created profile');
          return createdProfile;
        }

        return createdRes[0];
      }

      return res[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('GetMyProfile error', error);
      throw error;
    }
  }

  // Update or create profile
  async UpsertProfile(userId: string, profileData: any, linksData: any[], socialLinksData: any): Promise<any> {
    this.logger.info('Db.LinkInBio.UpsertProfile', { userId });

    const knexdb = this.GetKnex();

    try {
      // Start transaction
      return await knexdb.transaction(async (trx) => {
        // Update or insert profile
        const existingProfile = await trx('link_in_bio_profiles')
          .where({ user_id: userId })
          .first();

        let profile: any;
        if (existingProfile) {
          await trx('link_in_bio_profiles')
            .where({ id: existingProfile.id })
            .update({
              ...profileData,
              updatedAt: new Date(),
            });
          profile = await trx('link_in_bio_profiles')
            .where({ id: existingProfile.id })
            .first();
        } else {
          // Ensure required 'username' when creating a profile. Prefer incoming value, else derive from users table.
          let username = profileData?.username;
          if (!username || (typeof username === 'string' && username.trim() === '')) {
            const userRow = await trx('users').where({ id: userId }).first();
            if (userRow) {
              username = userRow.pageName || (userRow.email ? userRow.email.split('@')[0] : `user-${userId.slice(0, 8)}`);
            } else {
              username = `user-${userId.slice(0, 8)}`;
            }
          }

          const insertPayload = {
            user_id: userId,
            username,
            ...profileData,
          };

          const inserted = await trx('link_in_bio_profiles').insert(insertPayload).returning('*');
          profile = inserted[0];
        }

        // Handle links - delete all existing links first (but we'll re-add the default one)
        await trx('link_in_bio_links').where({ profile_id: profile.id }).del();

        // Always create the default "Become my True Fan" link as the first link
        // This link has the platform logo and cannot be removed
        const defaultLink = {
          profile_id: profile.id,
          type: 'standard',
          title: 'Become my True Fan',
          url: 'https://www.truefans.ng',
          icon: '🌐', // Platform logo emoji - represents True Fans
          is_active: true,
          order_index: 0, // Always first
        };

        // Insert the default link first
        await trx('link_in_bio_links').insert(defaultLink);

        // Insert custom links if provided (they will have order_index > 0)
        if (linksData && linksData.length > 0) {
          const processedLinks = linksData
            .filter((link: any) => link.title !== 'Become my True Fan') // Remove if user tried to include it
            .map((link: any, index: number) => ({
              profile_id: profile.id,
              type: link.type || 'standard',
              title: link.title,
              url: link.url || null,
              icon: link.icon || null,
              is_active: link.isActive !== false,
              scheduled_start: link.scheduledStart || null,
              scheduled_end: link.scheduledEnd || null,
              order_index: (link.order || 0) + 1, // Offset by 1 to make room for default link at 0
              custom_styles: link.customStyles || null,
              platform: link.platform || null,
              embed_code: link.embedCode || null,
              post_id: link.postId || null,
            }));

          if (processedLinks.length > 0) {
            await trx('link_in_bio_links').insert(processedLinks);
          }
        }

        // Handle social links
        const existingSocial = await trx('link_in_bio_social_links')
          .where({ profile_id: profile.id })
          .first();

        if (existingSocial) {
          await trx('link_in_bio_social_links')
            .where({ profile_id: profile.id })
            .update({
              ...socialLinksData,
              updatedAt: new Date(),
            });
        } else {
          await trx('link_in_bio_social_links').insert({
            profile_id: profile.id,
            ...socialLinksData,
          });
        }

        return profile;
      });
    } catch (error) {
      this.logger.error('UpsertProfile error', error);
      throw new AppError(500, 'Failed to update profile');
    }
  }

  // Track view
  async TrackView(profileId: string, viewData: any): Promise<void> {
    this.logger.info('Db.LinkInBio.TrackView', { profileId });

    try {
      const knexdb = this.GetKnex();

      // Check rate limit: 1 view per IP per profile per 5 minutes
      const recentView = await knexdb('link_in_bio_views')
        .where({ profile_id: profileId, ip_address: viewData.ip_address })
        .andWhere('viewed_at', '>', knexdb.raw("NOW() - INTERVAL '5 minutes'"))
        .first();

      if (recentView) {
        this.logger.debug('View rate limit hit', { profileId, ip: viewData.ip_address });
        return; // Silently ignore rate-limited request
      }

      const insertQuery = knexdb('link_in_bio_views').insert({
        profile_id: profileId,
        ip_address: viewData.ip_address,
        user_agent: viewData.user_agent,
        device_type: viewData.device_type,
        country_code: viewData.country_code,
        referrer: viewData.referrer,
      });

      const { err } = await this.RunQuery(insertQuery);

      if (err) {
        this.logger.error('Failed to track view', err);
        // Don't throw - tracking failures shouldn't break the app
      }
    } catch (error) {
      this.logger.error('TrackView error', error);
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  // Track click
  async TrackClick(linkId: string, profileId: string, clickData: any): Promise<void> {
    this.logger.info('Db.LinkInBio.TrackClick', { linkId, profileId });

    try {
      const knexdb = this.GetKnex();

      // Check rate limit: 1 click per IP per link per minute
      const recentClick = await knexdb('link_in_bio_clicks')
        .where({ link_id: linkId, ip_address: clickData.ip_address })
        .andWhere('clicked_at', '>', knexdb.raw("NOW() - INTERVAL '1 minute'"))
        .first();

      if (recentClick) {
        this.logger.debug('Click rate limit hit', { linkId, ip: clickData.ip_address });
        return; // Silently ignore rate-limited request
      }

      // Update click count on link
      await knexdb('link_in_bio_links')
        .where({ id: linkId })
        .increment('click_count', 1);

      // Insert click record
      const insertQuery = knexdb('link_in_bio_clicks').insert({
        link_id: linkId,
        profile_id: profileId,
        ip_address: clickData.ip_address,
        user_agent: clickData.user_agent,
        device_type: clickData.device_type,
        country_code: clickData.country_code,
        referrer: clickData.referrer,
      });

      const { err } = await this.RunQuery(insertQuery);

      if (err) {
        this.logger.error('Failed to track click', err);
        // Don't throw - tracking failures shouldn't break the app
      }
    } catch (error) {
      this.logger.error('TrackClick error', error);
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  // Get analytics
  async GetAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    this.logger.info('Db.LinkInBio.GetAnalytics', { userId });

    try {
      const knexdb = this.GetKnex();

      // Get profile first
      const profile = await knexdb('link_in_bio_profiles').where({ user_id: userId }).first();
      if (!profile) {
        throw new AppError(404, 'Profile not found');
      }

      const profileId = profile.id;
      const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default 90 days
      const end = endDate || new Date();

      // Get total views and clicks
      const statsQuery = knexdb.select(
        knexdb.raw('COUNT(DISTINCT v.id)::INTEGER as total_views'),
        knexdb.raw('COUNT(DISTINCT c.id)::INTEGER as total_clicks')
      )
        .from('link_in_bio_views as v')
        .leftJoin('link_in_bio_clicks as c', 'c.profile_id', 'v.profile_id')
        .where('v.profile_id', profileId)
        .andWhere('v.viewed_at', '>=', start)
        .andWhere('v.viewed_at', '<=', end);

      const { res: statsRes, err: statsErr } = await this.RunQuery(statsQuery);

      if (statsErr) {
        throw new AppError(400, 'Failed to fetch analytics');
      }

      const stats = statsRes?.[0] || { total_views: 0, total_clicks: 0 };

      // Get clicks by link
      const clicksByLinkQuery = knexdb.select(
        'l.id',
        'l.title',
        knexdb.raw('COUNT(c.id)::INTEGER as clicks')
      )
        .from('link_in_bio_links as l')
        .leftJoin('link_in_bio_clicks as c', 'c.link_id', 'l.id')
        .where('l.profile_id', profileId)
        .andWhere('c.clicked_at', '>=', start)
        .andWhere('c.clicked_at', '<=', end)
        .groupBy('l.id', 'l.title')
        .orderBy('clicks', 'desc');

      const { res: clicksByLinkRes, err: clicksByLinkErr } = await this.RunQuery(clicksByLinkQuery);

      const clicksByLink: Record<string, number> = {};
      if (!clicksByLinkErr && clicksByLinkRes) {
        clicksByLinkRes.forEach((item: any) => {
          clicksByLink[item.id] = item.clicks;
        });
      }

      // Get device breakdown
      const deviceQuery = knexdb.select(
        'device_type',
        knexdb.raw('COUNT(*)::INTEGER as count')
      )
        .from('link_in_bio_clicks')
        .where('profile_id', profileId)
        .andWhere('clicked_at', '>=', start)
        .andWhere('clicked_at', '<=', end)
        .groupBy('device_type');

      const { res: deviceRes } = await this.RunQuery(deviceQuery);

      const deviceBreakdown: Record<string, number> = {};
      if (deviceRes) {
        deviceRes.forEach((item: any) => {
          if (item.device_type) {
            deviceBreakdown[item.device_type] = item.count;
          }
        });
      }

      // Get geo data
      const geoQuery = knexdb.select(
        'country_code',
        knexdb.raw('COUNT(*)::INTEGER as count')
      )
        .from('link_in_bio_clicks')
        .where('profile_id', profileId)
        .andWhere('country_code', '!=', null)
        .andWhere('clicked_at', '>=', start)
        .andWhere('clicked_at', '<=', end)
        .groupBy('country_code')
        .orderBy('count', 'desc');

      const { res: geoRes } = await this.RunQuery(geoQuery);

      const geoData: Record<string, number> = {};
      if (geoRes) {
        geoRes.forEach((item: any) => {
          geoData[item.country_code] = item.count;
        });
      }

      // Get referrer data
      const referrerQuery = knexdb.select(
        'referrer',
        knexdb.raw('COUNT(*)::INTEGER as count')
      )
        .from('link_in_bio_clicks')
        .where('profile_id', profileId)
        .andWhere('referrer', '!=', null)
        .andWhere('clicked_at', '>=', start)
        .andWhere('clicked_at', '<=', end)
        .groupBy('referrer')
        .orderBy('count', 'desc')
        .limit(10);

      const { res: referrerRes } = await this.RunQuery(referrerQuery);

      const referrerData: Record<string, number> = {};
      if (referrerRes) {
        referrerRes.forEach((item: any) => {
          referrerData[item.referrer] = item.count;
        });
      }

      // Calculate conversion rate
      const conversionRate = stats.total_views > 0
        ? ((stats.total_clicks / stats.total_views) * 100).toFixed(2)
        : 0;

      return {
        totalViews: stats.total_views,
        totalClicks: stats.total_clicks,
        clicksByLink,
        deviceBreakdown,
        geoData,
        referrerData,
        conversionRate,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('GetAnalytics error', error);
      throw new AppError(500, 'Failed to fetch analytics');
    }
  }

  // Publish or unpublish profile
  async SetPublished(userId: string, isPublished: boolean): Promise<any> {
    this.logger.info('Db.LinkInBio.SetPublished', { userId, isPublished });

    try {
      const knexdb = this.GetKnex();

      if (isPublished) {
        // Validate before publishing. If profile doesn't exist, create a default one (which includes the mandatory default link).
        let profile: any = await knexdb('link_in_bio_profiles').where({ user_id: userId }).first();
        if (!profile) {
          profile = await this.GetOrCreateProfile(userId);
        }

        // Check if has at least 1 active link
        const activeLinksCount = await knexdb('link_in_bio_links')
          .where({ profile_id: profile.id, is_active: true })
          .count('* as count')
          .first();

        if (!activeLinksCount || Number(activeLinksCount.count) === 0) {
          throw new AppError(400, 'Must have at least 1 active link to publish');
        }
      }

      const updateQuery = knexdb('link_in_bio_profiles')
        .where({ user_id: userId })
        .update({ is_published: isPublished, updatedAt: new Date() })
        .returning('*');

      const { res, err } = await this.RunQuery(updateQuery);

      if (err) {
        this.logger.error('Failed to set published status', err);
        throw new AppError(400, `Failed to update publish status: ${err?.message || err}`);
      }

      return res?.[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('SetPublished error', error);
      throw error;
    }
  }

  // Get profile by custom slug
  async GetProfileByCustomSlug(slug: string): Promise<any> {
    this.logger.info('Db.LinkInBio.GetProfileByCustomSlug', { slug });

    try {
      const knexdb = this.GetKnex();

      const query = knexdb.select(
        'p.*',
        knexdb.raw(
          `json_agg(
            json_build_object(
              'id', l.id,
              'type', l.type,
              'title', l.title,
              'url', l.url,
              'icon', l.icon,
              'clicks', l.click_count,
              'order', l.order_index
            ) ORDER BY l.order_index
          ) FILTER (WHERE l.id IS NOT NULL) as links`
        ),
        knexdb.raw(
          `row_to_json(s) as social_links`
        )
      )
        .from(knexdb.raw('link_in_bio_profiles p'))
        .leftJoin('link_in_bio_links as l', (builder) => {
          builder
            .on('l.profile_id', '=', 'p.id')
            .andOn('l.is_active', '=', knexdb.raw('true'));
        })
        .leftJoin('link_in_bio_social_links as s', 's.profile_id', 'p.id')
        .where('p.custom_slug', slug)
        .andWhere('p.is_published', true)
        .groupBy('p.id', 's.id');

      const { res, err } = await this.RunQuery(query);

      if (err) {
        this.logger.error('Failed to fetch profile by slug', err);
        throw new AppError(400, 'Failed to fetch profile');
      }

      if (!res || res.length === 0) {
        throw new AppError(404, 'Profile not found');
      }

      return res[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('GetProfileByCustomSlug error', error);
      throw error;
    }
  }

  // Get profile ID by username (for tracking)
  async GetProfileIdByUsername(username: string): Promise<string> {
    this.logger.info('Db.LinkInBio.GetProfileIdByUsername', { username });

    try {
      const knexdb = this.GetKnex();
      const profile = await knexdb('link_in_bio_profiles')
        .where({ username, is_published: true })
        .select('id')
        .first();

      if (!profile) {
        throw new AppError(404, 'Profile not found');
      }

      return profile.id;
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('GetProfileIdByUsername error', error);
      throw error;
    }
  }

  // Get link by ID (for tracking)
  async GetLinkById(linkId: string): Promise<any> {
    this.logger.info('Db.LinkInBio.GetLinkById', { linkId });

    try {
      const knexdb = this.GetKnex();
      const link = await knexdb('link_in_bio_links')
        .where({ id: linkId })
        .first();

      if (!link) {
        throw new AppError(404, 'Link not found');
      }

      return link;
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('GetLinkById error', error);
      throw error;
    }
  }

  // Sync profile when user updates their main profile
  async SyncUserProfileData(userId: string, userData: any): Promise<void> {
    this.logger.info('Db.LinkInBio.SyncUserProfileData', { userId });

    try {
      const knexdb = this.GetKnex();

      const profileExists = await knexdb('link_in_bio_profiles')
        .where({ user_id: userId })
        .first();

      if (profileExists) {
        const updateData: any = {};

        if (userData.profilePhoto) updateData.profile_image = userData.profilePhoto;
        if (userData.coverPhoto) updateData.cover_image = userData.coverPhoto;
        if (userData.bio) updateData.bio = userData.bio;
        if (userData.name) updateData.display_name = userData.name;
        if (userData.pageName) updateData.username = userData.pageName;

        if (Object.keys(updateData).length > 0) {
          await knexdb('link_in_bio_profiles')
            .where({ user_id: userId })
            .update(updateData);
        }
      }
    } catch (error) {
      this.logger.error('SyncUserProfileData error', error);
      // Don't throw - sync failures shouldn't break main user update
    }
  }
}
