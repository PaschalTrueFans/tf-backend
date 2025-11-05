import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.alterTable('events', (t) => {
   
    t.string('liveStreamLink').nullable();
    t.boolean('isFree').defaultTo(true);
    t.uuid('memberShipId').references('id').inTable('memberships').nullable();
  })
}


function down(knex: Knex) {
  return knex.schema.alterTable('events', (t) => {
    t.dropColumn('liveStreamLink');
    t.dropColumn('isFree');
    t.dropColumn('memberShipId');
  })
}

export { up, down };