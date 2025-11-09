import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.createTable('admin', (t) => {
    t.uuid('id').unique().defaultTo(knex.raw('gen_random_uuid()')).primary();
    t.string('email').notNullable().unique();
    t.string('password').notNullable();
    t.string('name').notNullable();
    
    t.timestamp('createdAt').defaultTo(knex.fn.now());
    t.timestamp('updatedAt').defaultTo(knex.fn.now());

  }).raw(`
    DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp') THEN
            CREATE TRIGGER update_timestamp
            BEFORE UPDATE
            ON "admin"
            FOR EACH ROW
            EXECUTE PROCEDURE update_timestamp();
          END IF;
        END $$;
  `);
}

function down(knex: Knex) {
  return knex.schema.raw(`
    DROP TABLE "admin";
  `);
}

export { up, down };

