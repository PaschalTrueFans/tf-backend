import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.createTable('link_in_bio_links', (t) => {
    t.uuid('id').unique().defaultTo(knex.raw('gen_random_uuid()')).primary();
    t.uuid('profile_id').notNullable().references('id').inTable('link_in_bio_profiles').onDelete('CASCADE');
    
    t.string('type', 20).notNullable(); // standard, header, social, embedded, divider, post
    t.string('title', 255).notNullable();
    t.text('url').nullable();
    t.text('icon').nullable();
    
    t.boolean('is_active').defaultTo(true);
    t.timestamp('scheduled_start').nullable();
    t.timestamp('scheduled_end').nullable();
    
    t.integer('click_count').defaultTo(0);
    t.integer('order_index').notNullable().defaultTo(0);
    
    // Custom styling (JSON - optional)
    t.jsonb('custom_styles').nullable();
    
    // Type-specific fields
    t.string('platform', 50).nullable(); // for social type: instagram, twitter, etc.
    t.text('embed_code').nullable(); // for embedded type
    t.uuid('post_id').nullable().references('id').inTable('posts').onDelete('SET NULL'); // for post type
    
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  }).raw(`
    DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_timestamp_link_bio_links') THEN
            CREATE TRIGGER update_timestamp_link_bio_links
            BEFORE UPDATE
            ON "link_in_bio_links"
            FOR EACH ROW
            EXECUTE PROCEDURE update_timestamp();
          END IF;
        END $$;
  `).then(() => {
    return Promise.all([
      knex.raw('CREATE INDEX idx_link_profile ON link_in_bio_links(profile_id)'),
      knex.raw('CREATE INDEX idx_link_order ON link_in_bio_links(profile_id, order_index)'),
      knex.raw('CREATE INDEX idx_link_active ON link_in_bio_links(is_active)'),
      knex.raw('CREATE INDEX idx_link_scheduled ON link_in_bio_links(scheduled_start, scheduled_end) WHERE scheduled_start IS NOT NULL'),
    ]);
  });
}

function down(knex: Knex) {
  return knex.schema.raw(`
    DROP TABLE "link_in_bio_links" CASCADE;
  `);
}

export { up, down };
