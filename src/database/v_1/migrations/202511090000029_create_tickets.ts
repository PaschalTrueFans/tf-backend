import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tickets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('subject').notNullable();
    table.text('message').notNullable();
    table
      .enu('status', ['open', 'in_progress', 'completed'], {
        useNative: true,
        enumName: 'ticket_status_enum',
      })
      .notNullable()
      .defaultTo('open');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE TRIGGER update_timestamp_tickets
    BEFORE UPDATE ON "tickets"
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  `);

  await knex.schema.createTable('ticketComments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('ticketId').notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.uuid('adminId').nullable().references('id').inTable('admin').onDelete('SET NULL');
    table.text('comment').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE TRIGGER update_timestamp_ticket_comments
    BEFORE UPDATE ON "ticketComments"
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    DROP TRIGGER IF EXISTS update_timestamp_ticket_comments ON "ticketComments";
  `);
  await knex.schema.dropTableIfExists('ticketComments');

  await knex.schema.raw(`
    DROP TRIGGER IF EXISTS update_timestamp_tickets ON "tickets";
  `);
  await knex.schema.dropTableIfExists('tickets');

  await knex.schema.raw(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status_enum') THEN
        DROP TYPE ticket_status_enum;
      END IF;
    END $$;
  `);
}


