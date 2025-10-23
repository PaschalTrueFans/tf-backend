import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Core relationships
    table.uuid('subscriptionId').notNullable().references('id').inTable('subscriptions').onDelete('CASCADE');
    table.uuid('subscriberId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('creatorId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    
    // Stripe Integration
    table.string('stripePaymentIntentId').nullable(); // Stripe payment intent ID
    table.string('stripeChargeId').nullable(); // Stripe charge ID
    table.string('stripeInvoiceId').nullable(); // Stripe invoice ID
    table.string('stripePaymentMethodId').nullable(); // Payment method used
    table.string('stripeCustomerId').nullable(); // Stripe customer ID
    
    // Transaction Details
    table.string('transactionType').notNullable(); // subscription, payment, refund, chargeback, adjustment
    table.string('status').notNullable(); // succeeded, failed, pending, canceled, refunded
    table.decimal('amount', 10, 2).notNullable(); // Transaction amount
    table.string('currency', 3).notNullable().defaultTo('NGN'); // Currency code
    table.decimal('fee', 10, 2).nullable(); // Processing fee
    table.decimal('netAmount', 10, 2).nullable(); // Amount after fees
    
    // Billing Period (for subscription payments)
    
    table.timestamp('billingPeriodStart').nullable(); // Billing period start
    table.timestamp('billingPeriodEnd').nullable(); // Billing period end
    
    // Payment Details
    table.timestamp('processedAt').nullable(); // When transaction was processed
    table.timestamp('failedAt').nullable(); // When transaction failed
    table.string('failureReason').nullable(); // Reason for failure
    table.integer('retryCount').defaultTo(0); // Number of retry attempts
    
    // Refund Information
    table.decimal('refundAmount', 10, 2).nullable(); // Refund amount if applicable
    table.timestamp('refundedAt').nullable(); // When refund was processed
    table.string('refundReason').nullable(); // Reason for refund
    
    // Transaction Metadata
    table.json('metadata').nullable(); // Additional transaction data
    table.text('description').nullable(); // Transaction description
    table.string('receiptUrl').nullable(); // Receipt URL from Stripe
    
    // Timestamps
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    
    // Indexes for better performance
    table.index(['subscriptionId']);
    table.index(['subscriberId']);
    table.index(['creatorId']);
    table.index(['stripePaymentIntentId']);
    table.index(['stripeChargeId']);
    table.index(['transactionType']);
    table.index(['status']);
    table.index(['processedAt']);
    table.index(['billingPeriodStart']);
    table.index(['billingPeriodEnd']);
  }).raw(`
    DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp') THEN
            CREATE TRIGGER update_timestamp
            BEFORE UPDATE
            ON "transactions"
            FOR EACH ROW
            EXECUTE PROCEDURE update_timestamp();
          END IF;
        END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('transactions');
}
