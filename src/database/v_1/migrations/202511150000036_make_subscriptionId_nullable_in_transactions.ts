import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('transactions', (table) => {
    // Make subscriptionId nullable to support product purchases
    table.uuid('subscriptionId').nullable().alter();
    
    // Add productId for product purchases
    table.uuid('productId').nullable().references('id').inTable('products').onDelete('CASCADE');
    
    // Add index for productId
    table.index(['productId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('productId');
    // Note: We can't easily make subscriptionId non-nullable again without data cleanup
    // This is a one-way migration in practice
  });
}

