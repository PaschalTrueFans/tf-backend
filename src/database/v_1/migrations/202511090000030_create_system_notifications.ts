import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('systemNotifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.uuid('adminId').nullable().references('id').inTable('admin').onDelete('SET NULL');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE TRIGGER update_timestamp_system_notifications
    BEFORE UPDATE ON "systemNotifications"
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    DROP TRIGGER IF EXISTS update_timestamp_system_notifications ON "systemNotifications";
  `);
  await knex.schema.dropTableIfExists('systemNotifications');
}


