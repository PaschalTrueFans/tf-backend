import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('postLikes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('postId').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
     table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    
    // Ensure a user can only like a post once
    table.unique(['postId', 'userId']);
    
    // Add indexes for better performance
    table.index(['postId']);
    table.index(['userId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('postLikes');
}
