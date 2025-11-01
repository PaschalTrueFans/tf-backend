import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.createTable('products', (t) => {
    t.uuid('id').unique().defaultTo(knex.raw('gen_random_uuid()')).primary();
    t.uuid('creatorId').references('id').inTable('users').notNullable();
    t.string('name').notNullable();
    t.text('description').nullable();
    t.string('mediaUrl').nullable();
    t.string('price').notNullable();
    
    t.timestamp('createdAt').defaultTo(knex.fn.now());
    t.timestamp('updatedAt').defaultTo(knex.fn.now());

    t.index(['creatorId'], 'products_creatorId_index');
  }).raw(`
    DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp') THEN
            CREATE TRIGGER update_timestamp
            BEFORE UPDATE
            ON "products"
            FOR EACH ROW
            EXECUTE PROCEDURE update_timestamp();
          END IF;
        END $$;
  `);
}

function down(knex: Knex) {
  return knex.schema.raw(`
    DROP TABLE "products";
  `);
}

export { up, down };

