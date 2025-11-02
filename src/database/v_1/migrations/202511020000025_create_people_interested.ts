import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.createTable('people_interested', (t) => {
    t.uuid('id').unique().defaultTo(knex.raw('gen_random_uuid()')).primary();
    t.uuid('userId').references('id').inTable('users').notNullable();
    t.uuid('eventId').references('id').inTable('events').notNullable();

    t.timestamp('createdAt').defaultTo(knex.fn.now());
    t.timestamp('updatedAt').defaultTo(knex.fn.now());
    
    t.index(['userId'], 'people_interested_userId_index');
    t.index(['eventId'], 'people_interested_eventId_index');
  }).raw(`
    DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp') THEN
            CREATE TRIGGER update_timestamp
            BEFORE UPDATE
            ON "people_interested"
            FOR EACH ROW
            EXECUTE PROCEDURE update_timestamp();
          END IF;
        END $$;
  `);
}

function down(knex: Knex) {
  return knex.schema.raw(`
    DROP TABLE "people_interested";
  `);
}

export { up, down };

