import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('product_purchases', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Core relationships
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('productId').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.uuid('creatorId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    
    // Stripe Integration
    table.string('stripeCheckoutSessionId').nullable().unique(); // Stripe checkout session ID
    table.string('stripePaymentIntentId').nullable(); // Stripe payment intent ID
    table.string('stripeChargeId').nullable(); // Stripe charge ID
    table.string('stripeCustomerId').nullable(); // Stripe customer ID
    
    // Purchase Details
    table.decimal('amount', 10, 2).notNullable(); // Purchase amount
    table.string('currency', 3).notNullable().defaultTo('NGN'); // Currency code
    table.string('status').notNullable().defaultTo('pending'); // pending, completed, failed, refunded
    table.timestamp('purchasedAt').nullable(); // When purchase was completed
    
    // Timestamps
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    
    // Constraints
    table.unique(['userId', 'productId']); // One purchase per user-product pair
    
    // Indexes for better performance
    table.index(['userId']);
    table.index(['productId']);
    table.index(['creatorId']);
    table.index(['stripeCheckoutSessionId']);
    table.index(['status']);
    table.index(['purchasedAt']);
  }).raw(`
    DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp') THEN
            CREATE TRIGGER update_timestamp
            BEFORE UPDATE
            ON "product_purchases"
            FOR EACH ROW
            EXECUTE PROCEDURE update_timestamp();
          END IF;
        END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('product_purchases');
}

