import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.createTable('link_in_bio_clicks', (t) => {
    t.uuid('id').unique().defaultTo(knex.raw('gen_random_uuid()')).primary();
    t.uuid('link_id').notNullable().references('id').inTable('link_in_bio_links').onDelete('CASCADE');
    t.uuid('profile_id').notNullable().references('id').inTable('link_in_bio_profiles').onDelete('CASCADE');
    
    // Tracking data
    t.specificType('ip_address', 'INET').nullable();
    t.text('user_agent').nullable();
    t.string('device_type', 20).nullable();
    t.string('country_code', 2).nullable();
    t.text('referrer').nullable();
    
    t.timestamp('clicked_at').defaultTo(knex.fn.now());
  }).then(() => {
    return Promise.all([
      knex.raw('CREATE INDEX idx_clicks_link ON link_in_bio_clicks(link_id)'),
      knex.raw('CREATE INDEX idx_clicks_profile ON link_in_bio_clicks(profile_id)'),
      knex.raw('CREATE INDEX idx_clicks_date ON link_in_bio_clicks(profile_id, clicked_at DESC)'),
      knex.raw('CREATE INDEX idx_clicks_analytics ON link_in_bio_clicks(profile_id, clicked_at, link_id, device_type)'),
    ]);
  });
}

function down(knex: Knex) {
  return knex.schema.raw(`
    DROP TABLE "link_in_bio_clicks" CASCADE;
  `);
}

export { up, down };
