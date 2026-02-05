import { Db } from '../../database/db';
import { Logger } from '../../helpers/logger';
import { hashPassword } from '../../helpers/hash';
import { Entities } from '../../helpers';
import { AdminModel } from '../../database/models/Admin';

const admin: Partial<Entities.Admin> = {
  email: 'admin@ruutz.app',
  password: 'truefans@123',
  name: 'Truefans Admin',
};

export async function superCompanyAndAdminSeed(db: Db) {
  Logger.info('Running super admin...');

  try {
    const oldEmail = 'admin@truefans.ng';
    const oldAdmin = await AdminModel.findOne({ email: oldEmail });

    if (oldAdmin) {
      Logger.info(`Found old admin ${oldEmail}, removing...`);
      await AdminModel.deleteOne({ email: oldEmail });
      Logger.info(`Old admin removed.`);
    }
    if (!admin.email || !admin.password) throw new Error('Email and Password are required');

    const userExists = await db.v1.Admin.GetAdmin({ email: admin.email });

    if (userExists) {
      Logger.info('Super admin already exists');
      const user = await db.v1.User.GetUserByEmail(userExists.email);
      const hashedPassword = await hashPassword(admin.password);
      if (!user) {
        await db.v1.User.CreateUser({
          id: userExists.id,
          email: userExists.email,
          password: hashedPassword,
          name: userExists.name || 'Truefans Admin',
        });
      }
      Logger.info('user admin created', user);
    } else {
      Logger.info('Creating super admin...');

      const hashedPassword = await hashPassword(admin.password);

      admin.password = hashedPassword;

      const adminCreated = await db.v1.Admin.CreateAdmin(admin);

      if (adminCreated.id) {

        const user = await db.v1.User.GetUserByEmail(adminCreated.email);
        if (!user) {
          const newUser = await db.v1.User.CreateUser({
            id: adminCreated.id,
            email: adminCreated.email,
            password: hashedPassword,
            name: adminCreated.name,
          });
        }
        Logger.info('user admin created', user);
      }
    }
  } catch (error) {
    Logger.error('Error running super admin seed', error);
  }
}
