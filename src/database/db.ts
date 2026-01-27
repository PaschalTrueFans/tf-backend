import { Logger } from '../helpers/logger';
import { UserDatabase } from './v_1/controllers/user.database';
import { AdminDatabase } from './v_1/controllers/admin.database';
import { AuthDatabase } from './v_1/controllers/auth.database';
import { ChatDatabase } from './v_1/controllers/chat.database';
import { CommunityDatabase } from './v_1/controllers/community.database';
import { LinkInBioDatabase } from './v_1/controllers/link-in-bio.database';
import { WalletDatabase } from './v_1/controllers/wallet.database';
import { MongoDb } from './mongo';

export class Db {
  private static instance: Db;
  private logger: typeof Logger;

  public v1: {
    User: UserDatabase;
    Admin: AdminDatabase;
    Auth: AuthDatabase;
    Chat: ChatDatabase;
    Community: CommunityDatabase;
    LinkInBio: LinkInBioDatabase;
    Wallet: WalletDatabase;
  };

  private constructor() {
    // Private constructor for singleton
    this.logger = Logger;

    // We no longer pass knex related args. 
    // Controllers will import models directly or we can pass them here if we want 
    // dependency injection, but for now importing directly in controllers is easier for migration.
    // However, keeping the structure generic if possible.

    // For now, passing empty object or undefined as we transition
    // Ideally, we should refactor controllers to not need these args or accept different ones.
    const dbArgs = {};

    this.v1 = {
      User: new UserDatabase(dbArgs),
      Admin: new AdminDatabase(dbArgs),
      Auth: new AuthDatabase(dbArgs),
      Chat: new ChatDatabase(dbArgs),
      Community: new CommunityDatabase(dbArgs),
      LinkInBio: new LinkInBioDatabase(dbArgs),
      Wallet: new WalletDatabase(dbArgs),
    };
  }

  public static get Instance(): Db {
    if (!this.instance) {
      this.instance = new Db();
    }
    return this.instance;
  }

  public async Init(): Promise<void> {
    await MongoDb.Instance.Connect();
  }

  public async DisconnectDb(): Promise<void> {
    await MongoDb.Instance.Disconnect();
  }
}
