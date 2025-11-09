import { Db } from '../../database/db';
import { Logger } from '../../helpers/logger';
import { hashPassword } from '../../helpers/hash';
import { Entities } from '../../helpers';

const admin: Partial<Entities.Admin> = {
  email: 'admin@truefans.ng',
  password: 'truefans@123',
  name: 'Truefans Admin',
};

export async function superCompanyAndAdminSeed(db: Db) {
  Logger.info('Running super admin...');

  try {
    if (!admin.email || !admin.password) throw new Error('Email and Password are required');

    const userExists = await db.v1.Admin.GetAdmin({ email: admin.email });

    if (userExists) {
      Logger.info('Super admin already exists');
    } else {
      Logger.info('Creating super admin...');

      const hashedPassword = await hashPassword(admin.password);

      admin.password = hashedPassword;

      await db.v1.User.CreateUser(admin);
    }
  } catch (error) {
    Logger.error('Error running super admin seed', error);
  }
}
