import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('transactions', (table) => {
    // Add balance status field to track Stripe balance availability
    // 'incoming' = money is pending/incoming, not yet available
    // 'available' = money is available for payout
    table.string('balanceStatus').nullable().defaultTo('incoming');
    
    // Add index for faster queries
    table.index(['balanceStatus']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('transactions', (table) => {
    table.dropIndex(['balanceStatus']);
    table.dropColumn('balanceStatus');
  });
}

