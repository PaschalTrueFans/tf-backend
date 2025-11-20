import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('transactions', (table) => {
    table.decimal('platformFee', 5, 2).nullable().comment('Platform fee percentage applied');
    table.decimal('originalPrice', 10, 2).nullable().comment('Original price before platform fee');
    table.decimal('priceWithFee', 10, 2).nullable().comment('Price with platform fee included');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('platformFee');
    table.dropColumn('originalPrice');
    table.dropColumn('priceWithFee');
  });
}

