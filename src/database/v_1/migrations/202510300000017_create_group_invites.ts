import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('group_invites', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('creatorId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.string('groupName').notNullable();
    table.string('platform').notNullable();
    table.text('link').notNullable();


    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp_group_invites') THEN
        CREATE TRIGGER update_timestamp_group_invites
        BEFORE UPDATE
        ON "group_invites"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('group_invites');
}
