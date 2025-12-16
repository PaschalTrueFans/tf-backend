import * as express from 'express';
import { Response, Request } from 'express';
import { Db } from '../../../../database/db';
import { Logger } from '../../../../helpers/logger';
import { genericError, RequestBody, RequestQuery } from '../../../../helpers/utils';
import { LinkInBioService } from '../services/link-in-bio.service';
import * as LinkInBioModel from '../models/link-in-bio.model';

export class LinkInBioController {
  constructor() {
    Logger.info('LinkInBio controller initialized...');
  }

  // Get or create profile for authenticated user
  public getOrCreateProfile = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new LinkInBioService({ db });
      const userId = req.userId;
      const response = await service.GetOrCreateProfile(userId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get my profile (for editing)
  public getMyProfile = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new LinkInBioService({ db });
      const userId = req.userId;
      const response = await service.GetMyProfile(userId);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get public profile by username
  public getPublicProfile = async (
    req: Request & { params: { username: string } },
    res: Response
  ): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new LinkInBioService({ db });
      const { username } = req.params;

      if (!username) {
        res.status(400).json({ error: 'Username is required' });
        return;
      }

      const response = await service.GetPublicProfile(username);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Update profile
  public updateProfile = async (
    req: RequestBody<LinkInBioModel.UpdateLinkInBioProfile>,
    res: Response
  ): Promise<void> => {
    let body;
    try {
      Logger.info('LinkInBioController.updateProfile', { body: req.body, links: req.body.links });
      // Validate request body
      await LinkInBioModel.UpdateLinkInBioProfileSchema.parseAsync(req.body);

      const db = res.locals.db as Db;
      const service = new LinkInBioService({ db });
      const userId = req.userId;

      const response = await service.UpdateProfile(userId, req.body);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Track view
  public trackView = async (
    req: Request & { params: { username: string } },
    res: Response
  ): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new LinkInBioService({ db });
      const { username } = req.params;
      const { deviceType, referrer } = req.body;

      if (!username) {
        res.status(400).json({ error: 'Username is required' });
        return;
      }

      const ip = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.get('user-agent') || '';

      await service.TrackView(username, ip, userAgent, deviceType || undefined, referrer);

      body = {};
    } catch (error) {
      genericError(error, res);
    }
    res.status(204).end();
  };

  // Track click
  public trackClick = async (
    req: RequestBody<LinkInBioModel.TrackClick>,
    res: Response
  ): Promise<void> => {
    let body;
    try {
      // Validate request body
      await LinkInBioModel.TrackClickSchema.parseAsync(req.body);

      const db = res.locals.db as Db;
      const service = new LinkInBioService({ db });
      const { linkId, username, deviceType } = req.body;

      const ip = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.get('user-agent') || '';
      const referrer = req.get('referrer') || undefined;

      await service.TrackClick(linkId, username, ip, userAgent, deviceType || undefined, referrer);

      body = {};
    } catch (error) {
      genericError(error, res);
    }
    res.status(204).end();
  };

  // Get analytics
  public getAnalytics = async (req: Request, res: Response): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new LinkInBioService({ db });
      const userId = req.userId;

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const response = await service.GetAnalytics(userId, start, end);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Publish profile
  public publishProfile = async (
    req: RequestBody<LinkInBioModel.PublishLinkInBio>,
    res: Response
  ): Promise<void> => {
    let body;
    try {
      // Validate request body
      await LinkInBioModel.PublishLinkInBioSchema.parseAsync(req.body);

      const db = res.locals.db as Db;
      const service = new LinkInBioService({ db });
      const userId = req.userId;
      const { isPublished } = req.body;

      const response = await service.PublishProfile(userId, isPublished);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };

  // Get profile by custom slug (public)
  public getProfileBySlug = async (
    req: Request & { params: { slug: string } },
    res: Response
  ): Promise<void> => {
    let body;
    try {
      const db = res.locals.db as Db;
      const service = new LinkInBioService({ db });
      const { slug } = req.params;

      if (!slug) {
        res.status(400).json({ error: 'Slug is required' });
        return;
      }

      const response = await service.GetProfileByCustomSlug(slug);

      body = {
        data: response,
      };
    } catch (error) {
      genericError(error, res);
    }
    res.json(body);
  };
}
