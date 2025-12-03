import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.createTable('link_in_bio_views', (t) => {
    t.uuid('id').unique().defaultTo(knex.raw('gen_random_uuid()')).primary();
    t.uuid('profile_id').notNullable().references('id').inTable('link_in_bio_profiles').onDelete('CASCADE');
    
    // Tracking data
    t.specificType('ip_address', 'INET').nullable();
    t.text('user_agent').nullable();
    t.string('device_type', 20).nullable(); // mobile, desktop, tablet
    t.string('country_code', 2).nullable();
    t.text('referrer').nullable();
    
    t.timestamp('viewed_at').defaultTo(knex.fn.now());
  }).then(() => {
    return Promise.all([
      knex.raw('CREATE INDEX idx_views_link ON link_in_bio_views(profile_id)'),
      knex.raw('CREATE INDEX idx_views_date ON link_in_bio_views(profile_id, viewed_at DESC)'),
      knex.raw('CREATE INDEX idx_views_analytics ON link_in_bio_views(profile_id, viewed_at, device_type)'),
    ]);
  });
}

function down(knex: Knex) {
  return knex.schema.raw(`
    DROP TABLE "link_in_bio_views" CASCADE;
  `);
}

export { up, down };
