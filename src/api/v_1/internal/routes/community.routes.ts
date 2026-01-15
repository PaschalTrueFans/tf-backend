import * as express from 'express';
import { jwtAuth } from '../middlewares/api-auth';
import { CommunityController } from '../controller/community.controller';

const router = express.Router();
const controller = new CommunityController();

router.use(jwtAuth);

// Communities
router.get('/explore', controller.exploreCommunities);
router.post('/', controller.createCommunity);
router.get('/my', controller.getMyCommunity);
router.get('/joined', controller.getJoinedCommunities);
router.get('/:communityId', controller.getCommunity);
router.get('/:communityId/insights', controller.getCommunityInsights);
router.put('/:communityId', controller.updateCommunity);
router.delete('/:communityId', controller.deleteCommunity);

// Channels
router.post('/:communityId/channels', controller.createChannel);
router.get('/:communityId/channels', controller.getChannels);
router.post('/:communityId/channels/:channelId/messages', controller.createChannelMessage);
router.get('/:communityId/channels/:channelId/messages', controller.getChannelMessages);

// Members
router.post('/:communityId/join', controller.joinCommunity);
router.post('/:communityId/leave', controller.leaveCommunity);
router.get('/:communityId/member', controller.getMyMember);
router.delete('/:communityId/members/:memberId', controller.kickMember);

// Roles
router.post('/:communityId/roles', controller.createRole);
router.get('/:communityId/roles', controller.getRoles);

// Messages
router.delete('/:communityId/messages/:messageId', controller.deleteMessage);

// Polls
router.post('/:communityId/channels/:channelId/polls', controller.createPoll);
router.post('/:communityId/polls/:pollId/vote', controller.votePoll);
router.get('/:communityId/polls/:pollId', controller.getPoll);

// Events
router.post('/:communityId/events', controller.createEvent);
router.get('/:communityId/events', controller.getEvents);
router.post('/:communityId/events/:eventId/rsvp', controller.rsvpEvent);

// Moderation
router.post('/:communityId/report', controller.reportContent);

// Emojis
router.post('/:communityId/emojis', controller.addEmoji);
router.get('/:communityId/emojis', controller.getEmojis);

export const communityRoutes = router;
