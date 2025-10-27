import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('memberId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .uuid('creatorId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    table.unique(['memberId', 'creatorId']);
    table.index(['memberId']);
    table.index(['creatorId']);
  });

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp_conversations') THEN
        CREATE TRIGGER update_timestamp_conversations
        BEFORE UPDATE
        ON "conversations"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('conversations');
}


