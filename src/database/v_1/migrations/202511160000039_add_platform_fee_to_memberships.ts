import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('memberships', (table) => {
    table.decimal('platformFee', 5, 2).nullable().comment('Platform fee percentage applied');
    table.decimal('priceWithFee', 10, 2).nullable().comment('Price with platform fee included (for Stripe)');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('memberships', (table) => {
    table.dropColumn('platformFee');
    table.dropColumn('priceWithFee');
  });
}

