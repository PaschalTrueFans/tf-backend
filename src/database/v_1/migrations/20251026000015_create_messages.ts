import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('conversationId')
      .notNullable()
      .references('id')
      .inTable('conversations')
      .onDelete('CASCADE');

    table
      .uuid('senderId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.text('content').notNullable();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    table.index(['conversationId']);
    table.index(['senderId']);
    table.index(['createdAt']);
  });

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp_messages') THEN
        CREATE TRIGGER update_timestamp_messages
        BEFORE UPDATE
        ON "messages"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('messages');
}


