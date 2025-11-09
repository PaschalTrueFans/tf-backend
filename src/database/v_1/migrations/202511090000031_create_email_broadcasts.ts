import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('emailBroadcasts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('subject').notNullable();
    table.text('message').notNullable();
    table.integer('recipientCount').notNullable().defaultTo(0);
    table.uuid('adminId').nullable().references('id').inTable('admin').onDelete('SET NULL');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE TRIGGER update_timestamp_email_broadcasts
    BEFORE UPDATE ON "emailBroadcasts"
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    DROP TRIGGER IF EXISTS update_timestamp_email_broadcasts ON "emailBroadcasts";
  `);
  await knex.schema.dropTableIfExists('emailBroadcasts');
}


