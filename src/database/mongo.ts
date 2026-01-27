import mongoose from 'mongoose';
import { ENV } from '../helpers/env';
import { Logger } from '../helpers/logger';

export class MongoDb {
    private static instance: MongoDb;

    private constructor() {
        // Private constructor for singleton
    }

    public static get Instance(): MongoDb {
        if (!this.instance) {
            this.instance = new MongoDb();
        }
        return this.instance;
    }

    public async Connect(): Promise<void> {
        try {
            const uri = ENV.Database.MONGO_URI;

            if (!uri) {
                throw new Error('MONGO_URI is not defined in environment variables');
            }

            await mongoose.connect(uri);
            Logger.info('Connected to MongoDB');
        } catch (error) {
            Logger.error('Failed to connect to MongoDB', error);
            throw error;
        }
    }

    public async Disconnect(): Promise<void> {
        try {
            await mongoose.disconnect();
            Logger.info('Disconnected from MongoDB');
        } catch (error) {
            Logger.error('Failed to disconnect from MongoDB', error);
        }
    }
}
