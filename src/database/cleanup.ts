/* eslint-disable */
import dotenv from 'dotenv';
const result = dotenv.config();

import mongoose from 'mongoose';
import { ENV } from '../helpers/env';
import { Logger } from '../helpers/logger';

(async () => {
  await cleanUpDatabase();
})();

async function cleanUpDatabase() {
  if (ENV.Server.IS_LOCAL_ENV) {
    Logger.info('Getting ready to cleanup...');
    Logger.info('Connecting database');

    try {
      if (!ENV.Database.MONGO_URI) throw new Error('MONGO_URI is undefined');
      await mongoose.connect(ENV.Database.MONGO_URI);

      Logger.info('Dropping database...');
      await mongoose.connection.dropDatabase();
      Logger.info('Database cleaned');
    } catch (e) {
      console.error('Error', e);
      throw e;
    } finally {
      await mongoose.disconnect();
    }
  } else {
    Logger.info('Not in local environment');
  }
}
