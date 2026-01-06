import { Db } from '../src/database/db';
import mongoose from 'mongoose';
import { Logger } from '../src/helpers/logger';

async function main() {
    console.log('Initializing DB...');
    await Db.Instance.Init();
    const db = Db.Instance;

    try {
        console.log('Creating Test Users...');
        const creatorId = new mongoose.Types.ObjectId().toString();
        const memberId = new mongoose.Types.ObjectId().toString();

        await db.v1.User.CreateUser({
            _id: new mongoose.Types.ObjectId(creatorId),
            name: 'Creator Test',
            email: `creator_${Date.now()}@test.com`,
            password: 'password',
            role: 'creator' // Assuming 'role' field exists and accepts this
        } as any);

        await db.v1.User.CreateUser({
            _id: new mongoose.Types.ObjectId(memberId),
            name: 'Member Test',
            email: `member_${Date.now()}@test.com`,
            password: 'password',
            role: 'member'
        } as any);

        console.log(`Creator: ${creatorId}, Member: ${memberId}`);

        // 1. Create Community
        console.log('Step 1: Creating Community...');
        const community = await db.v1.Community.CreateCommunity(creatorId, {
            name: 'Test Community',
            description: 'A place for testing',
            isPrivate: false
        });
        console.log('Community Created:', community.id);

        if (!community) throw new Error('Community creation failed');
        if (community.creatorId !== creatorId) throw new Error('Community creator mismatch');

        // 2. Verify Channels
        console.log('Step 2: Verifying Default Channels...');
        const channels = await db.v1.Community.GetChannels(community.id);
        console.log('Channels:', channels.map(c => `${c.name} (${c.type})`));
        if (channels.length < 2) throw new Error('Default channels not created');

        const generalChannel = channels.find(c => c.name === 'general');
        if (!generalChannel) throw new Error('General channel missing');

        // 3. Join Community
        console.log('Step 3: Joining Community...');
        const member = await db.v1.Community.AddMember(community.id, memberId);
        console.log('Member Joined:', member.id);
        if (member.userId !== memberId) throw new Error('Member user ID mismatch');

        // 4. Send Message (Simulating Socket payload processing)
        console.log('Step 4: Sending Message...');
        const messageContent = 'Hello World!';
        const message = await db.v1.Community.CreateChannelMessage(generalChannel._id, memberId, messageContent);
        console.log('Message Created:', message.id);
        if (message.content !== messageContent) throw new Error('Message content mismatch');

        // 5. Update XP (Simulating Socket side effect)
        console.log('Step 5: Updating XP...');
        const updatedMember = await db.v1.Community.UpdateMemberXP(community.id, memberId, 10);
        console.log(`Member XP: ${updatedMember.xp}, Level: ${updatedMember.level}`);

        if (updatedMember.xp !== 10) throw new Error('XP update failed');

        // 6. Level Up Test
        console.log('Step 6: Testing Level Up...');
        // Level = sqrt(xp/100). To reach level 1, need 100 xp.
        await db.v1.Community.UpdateMemberXP(community.id, memberId, 90); // 10 + 90 = 100
        const leveledMember = await db.v1.Community.GetMember(community.id, memberId);
        console.log(`Member XP: ${leveledMember.xp}, Level: ${leveledMember.level}`);

        if (leveledMember.level !== 1) throw new Error('Level up failed');

        console.log('VERIFICATION SUCCESSFUL');

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    } finally {
        await Db.Instance.DisconnectDb(); // Adjust if DisconnectDb is not static or different
        process.exit(0);
    }
}

main();
