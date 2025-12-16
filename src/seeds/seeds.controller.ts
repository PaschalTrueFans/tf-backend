import { Db } from '../database/db';
import { Env } from '../helpers';
import { Logger } from '../helpers/logger';
import { superCompanyAndAdminSeed } from './v_1/SuperAdmin.seed';
import { categoriesSeed } from './v_1/Categories.seed';

export class SeedsController {
  private db: Db;

  constructor() {
    Logger.info('Seeds controller initialized...');
    this.db = new Db();
  }

  public async initSeeds() {
    // Connection should be established before calling this in server context
    // await this.db.Init(); 
    await this.runSeeds();
    // Do not disconnect, as server needs to stay alive
    // await this.db.DisconnectDb();
  }

  private async runSeeds() {
    const seeders = [this.runProdSeeds()];
    if (Env.Server.IS_LOCAL_ENV) {
      // seeders.push(this.runLocalSeeds());
    }
    await Promise.all(seeders);
  }

  private async runProdSeeds() {
    Logger.info('Seeding all seeds...');
    const seeders = [
      superCompanyAndAdminSeed(this.db),
      categoriesSeed(this.db)
    ];
    await Promise.all(seeders);
  }

  private async runLocalSeeds() {
    Logger.info('Seeding local database...');
    // const seeders = [
    //   fixProjectSectionKeys(this.db)
    // ];
    // await Promise.all(seeders);
  }
}
