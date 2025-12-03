import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('link_in_bio_profiles', (t) => {
        t.renameColumn('created_at', 'createdAt');
        t.renameColumn('updated_at', 'updatedAt');
    });

    await knex.schema.alterTable('link_in_bio_links', (t) => {
        t.renameColumn('created_at', 'createdAt');
        t.renameColumn('updated_at', 'updatedAt');
    });

    await knex.schema.alterTable('link_in_bio_social_links', (t) => {
        t.renameColumn('created_at', 'createdAt');
        t.renameColumn('updated_at', 'updatedAt');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('link_in_bio_profiles', (t) => {
        t.renameColumn('createdAt', 'created_at');
        t.renameColumn('updatedAt', 'updated_at');
    });

    await knex.schema.alterTable('link_in_bio_links', (t) => {
        t.renameColumn('createdAt', 'created_at');
        t.renameColumn('updatedAt', 'updated_at');
    });

    await knex.schema.alterTable('link_in_bio_social_links', (t) => {
        t.renameColumn('createdAt', 'created_at');
        t.renameColumn('updatedAt', 'updated_at');
    });
}
