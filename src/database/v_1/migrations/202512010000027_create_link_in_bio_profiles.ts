import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.createTable('link_in_bio_profiles', (t) => {
    t.uuid('id').unique().defaultTo(knex.raw('gen_random_uuid()')).primary();
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('username', 255).notNullable();
    t.string('display_name', 255).nullable();
    t.text('profile_image').nullable();
    t.text('cover_image').nullable();
    t.text('bio').nullable();
    t.string('theme', 50).defaultTo('true-fans');
    
    // Background settings (JSON)
    t.string('background_type', 20).defaultTo('gradient');
    t.text('background_value').nullable();
    
    // Custom colors and font (JSONB - optional)
    t.jsonb('custom_colors').nullable();
    t.string('custom_font', 100).nullable();
    
    // Features
    t.boolean('show_latest_posts').defaultTo(true);
    
    // Publishing
    t.boolean('is_published').defaultTo(false);
    t.string('custom_slug', 255).nullable().unique();
    
    // SEO
    t.string('seo_title', 255).nullable();
    t.text('seo_description').nullable();
    
    // Timestamps with timezone awareness
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Constraints
    t.unique(['user_id']);
  }).raw(`
    DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp_link_bio_profiles') THEN
            CREATE TRIGGER update_timestamp_link_bio_profiles
            BEFORE UPDATE
            ON "link_in_bio_profiles"
            FOR EACH ROW
            EXECUTE PROCEDURE update_timestamp();
          END IF;
        END $$;
  `).then(() => {
    // Create indexes
    return Promise.all([
      knex.raw('CREATE INDEX idx_link_bio_username ON link_in_bio_profiles(username)'),
      knex.raw('CREATE INDEX idx_link_bio_custom_slug ON link_in_bio_profiles(custom_slug) WHERE custom_slug IS NOT NULL'),
      knex.raw('CREATE INDEX idx_link_bio_published ON link_in_bio_profiles(is_published) WHERE is_published = true'),
      knex.raw('CREATE INDEX idx_link_bio_user ON link_in_bio_profiles(user_id)'),
    ]);
  });
}

function down(knex: Knex) {
  return knex.schema.raw(`
    DROP TABLE "link_in_bio_profiles" CASCADE;
  `);
}

export { up, down };
