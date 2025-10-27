import { Db } from '../../database/db';
import { Entities } from '../../helpers';
import { Logger } from '../../helpers/logger';

const categories = [
  'Actors',
  'Musicians',
  'Athletes',
  'Artists',
  'Writers',
  'Chefs',
  'Entrepreneurs',
  'Educators',
  'Tech',
  'Health',
  'Fashion',
  'Beauty',
  'Travel',
  'Gaming',
  'Journalists',
  'Politicians',
  'Spiritual',
  'Scientists',
  'Influencers',
  'Celebrities'
];

export async function categoriesSeed(db: Db) {
  Logger.info('Running categories seed...');

  try {
    // Check if categories table is empty
    const existingCategories = await db.v1.User.GetCategories();
    
    if (existingCategories.length > 0) {
      Logger.info('Categories already exist, skipping seed');
      return;
    }

    Logger.info(`Creating ${categories.length} categories...`);

    // Insert all categories
    const categoriesToInsert = categories.map(name => ({
      name,
      parentId: null,
    }));

    await  db.v1.User.AddCategories(categoriesToInsert as Entities.Category[]);
    
    Logger.info('Categories seed completed successfully');
  } catch (error) {
    Logger.error('Error running categories seed', error);
    throw error;
  }
}
