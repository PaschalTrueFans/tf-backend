import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('userId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.text('title').notNullable();
    table.text('message').notNullable();
    table.string('redirectUrl').notNullable();
    table.uuid('fromUserId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['member', 'creator']).notNullable();

    table.boolean('isRead').defaultTo(false);

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp_messages') THEN
        CREATE TRIGGER update_timestamp_messages
        BEFORE UPDATE
        ON "notifications"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}


