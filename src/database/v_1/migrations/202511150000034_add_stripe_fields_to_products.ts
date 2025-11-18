import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('products', (table) => {
    // Stripe product and price IDs
    table.string('stripeProductId').nullable().unique();
    table.string('stripePriceId').nullable().unique();
    
    // Add indexes for better performance
    table.index(['stripeProductId']);
    table.index(['stripePriceId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('products', (table) => {
    table.dropColumn('stripeProductId');
    table.dropColumn('stripePriceId');
  });
}

