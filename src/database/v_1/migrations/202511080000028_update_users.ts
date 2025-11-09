import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.alterTable('users', (t) => {
   
    t.boolean('isBlocked').defaultTo(false).notNullable();
  })
}

function down(knex: Knex) {
    return knex.schema.alterTable('users', (t) => {
      t.dropColumn('isBlocked');
    })
}

export { up, down };
