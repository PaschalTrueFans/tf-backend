import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.createTable('link_in_bio_social_links', (t) => {
    t.uuid('id').unique().defaultTo(knex.raw('gen_random_uuid()')).primary();
    t.uuid('profile_id').notNullable().references('id').inTable('link_in_bio_profiles').onDelete('CASCADE');
    
    t.string('instagram', 500).nullable();
    t.string('twitter', 500).nullable();
    t.string('facebook', 500).nullable();
    t.string('youtube', 500).nullable();
    t.string('tiktok', 500).nullable();
    t.string('snapchat', 500).nullable();
    t.string('github', 500).nullable();
    t.string('website', 500).nullable();
    t.string('spotify', 500).nullable();
    
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    
    t.unique(['profile_id']);
  }).raw(`
    DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp_link_bio_social') THEN
            CREATE TRIGGER update_timestamp_link_bio_social
            BEFORE UPDATE
            ON "link_in_bio_social_links"
            FOR EACH ROW
            EXECUTE PROCEDURE update_timestamp();
          END IF;
        END $$;
  `);
}

function down(knex: Knex) {
  return knex.schema.raw(`
    DROP TABLE "link_in_bio_social_links" CASCADE;
  `);
}

export { up, down };
