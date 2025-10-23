import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Core subscription relationship
    table.uuid('subscriberId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('creatorId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('membershipId').notNullable().references('id').inTable('memberships').onDelete('CASCADE');
    
    // Stripe Integration (essential for subscription management)
    table.string('stripeSubscriptionId').nullable().unique(); // Stripe subscription ID
    table.string('stripeCustomerId').nullable(); // Stripe customer ID
    
    // Subscription status (core to subscription logic)
    table.string('subscriptionStatus').notNullable().defaultTo('active'); // active, canceled, past_due, incomplete, trialing, paused
    table.boolean('isActive').defaultTo(true); // Quick status check
    
    
    // Subscription lifecycle
    table.timestamp('startedAt').nullable(); // When subscription started
    table.timestamp('canceledAt').nullable(); // When subscription was canceled
    table.text('cancelReason').nullable(); // Reason for cancellation
    
    // Timestamps
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    
    // Constraints
    table.unique(['subscriberId', 'creatorId']); // One subscription per user-creator pair
    table.check('?? IN (?, ?, ?, ?, ?, ?)', ['subscriptionStatus', 'active', 'canceled', 'past_due', 'incomplete', 'trialing', 'paused']);
    
    // Indexes for better performance
    table.index(['subscriberId']);
    table.index(['creatorId']);
    table.index(['membershipId']);
    table.index(['stripeSubscriptionId']);
    table.index(['subscriptionStatus']);
    table.index(['isActive']);
  }).raw(`
    DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp') THEN
            CREATE TRIGGER update_timestamp
            BEFORE UPDATE
            ON "subscriptions"
            FOR EACH ROW
            EXECUTE PROCEDURE update_timestamp();
          END IF;
        END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('subscriptions');
}
