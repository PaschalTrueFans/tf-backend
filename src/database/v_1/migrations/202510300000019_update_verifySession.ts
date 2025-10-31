import { Knex } from 'knex';

function up(knex: Knex) {
  return knex.schema.alterTable('verifySession', (t) => {
   
    t.renameColumn('sessionToken', 'otp');
  })
}


function down(knex: Knex) {
  return knex.schema.alterTable('verifySession', (t) => {
    t.renameColumn('otp', 'sessionToken');
  })
}

export { up, down };