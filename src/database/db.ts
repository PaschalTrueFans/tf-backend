import knex, { Knex } from 'knex';
import { types } from 'pg';
import { builtins } from 'pg-types';
import { ENV } from '../helpers/env';
import { Logger } from '../helpers/logger';
import { UserDatabase } from './v_1/controllers/user.database';
import { AuthDatabase } from './v_1/controllers/auth.database';
import { ChatDatabase } from './v_1/controllers/chat.database';
import { AdminDatabase } from './v_1/controllers/admin.database';
import { LinkInBioDatabase } from './v_1/controllers/link-in-bio.database';

export class Db {
  // eslint-disable-next-line no-use-before-define
  private static instance: Db;

  private logger: typeof Logger;

  private db: Knex | undefined;

  public v1: {
    User: UserDatabase;
    Admin: AdminDatabase;
    Auth: AuthDatabase;
    Chat: ChatDatabase;
    LinkInBio: LinkInBioDatabase;
  };

  // public v2: {
  //   User: UserDatabaseV2;
  //   Company: CompanyDatabaseV2;
  //   Project: ProjectDatabaseV2;
  // };

  public constructor() {
    this.logger = Logger;

    const dbArgs = {
      GetKnex: this.GetKnex.bind(this),
      RunQuery: this.RunQuery.bind(this),
    };

    this.v1 = {
      User: new UserDatabase(dbArgs),
      Admin: new AdminDatabase(dbArgs),
      Auth: new AuthDatabase(dbArgs),
      Chat: new ChatDatabase(dbArgs),
      LinkInBio: new LinkInBioDatabase(dbArgs),
    };

    // this.v2 = {
    //   User: new UserDatabaseV2(dbArgs),
    //   Company: new CompanyDatabaseV2(dbArgs),
    //   Project: new ProjectDatabaseV2(dbArgs),
    // };
  }

  public static get Instance(): Db {
    if (!this.instance) {
      this.instance = new Db();
    }

    return this.instance;
  }

  public Init(): void {
    if (!this.db) {
      this.logger.debug('Connecting to database');
      const parseDate = (value: string) => value;
      types.setTypeParser(builtins.DATE as number, parseDate);
      this.db = knex({
        client: 'pg',
        connection: {
          host: ENV.Database.DB_HOST,
          user: ENV.Database.DB_USER,
          database: ENV.Database.DB_NAME,
          password: ENV.Database.DB_PASSWORD,
          ssl: ENV.Server.IS_LOCAL_ENV ? undefined : { rejectUnauthorized: false },
        },
      });
    }
  }

  public async DisconnectDb(): Promise<void> {
    try {
      if (this.db) {
        this.logger.info('Cleaning up database');
        await this.db.destroy();
      }
    } catch (e) {
      this.logger.error('Failed to cleanup database', e);
    } finally {
      this.db = undefined;
    }
  }

  private GetKnex(): Knex {
    this.Init();
    return this.db as Knex;
  }

  private async RunQuery(
    query: Knex.QueryBuilder,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ res?: any[]; err: any }> {
    try {
      this.logger.debug(query.toSQL().toNative());
      const res = await query;
      return { res, err: null };
    } catch (e) {
      return { res: undefined, err: e };
    }
  }
}
