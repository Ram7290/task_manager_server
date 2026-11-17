const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database. Syncing tables...');
    await sequelize.sync({ force: true });
    console.log('Tables synced.');

    console.log('Seeding Users...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const managerPassword = await bcrypt.hash('Manager@123', 10);
    const employeePassword = await bcrypt.hash('Employee@123', 10);

    await User.create({
      first_name: 'System',
      last_name: 'Administrator',
      email: 'admin@company.com',
      password_hash: adminPassword,
      role: 'ADMIN',
      is_active: true,
    });

    await User.create({
      first_name: 'Sarah',
      last_name: 'Connor',
      email: 'manager@company.com',
      password_hash: managerPassword,
      role: 'MANAGER',
      is_active: true,
    });

    await User.create({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@company.com',
      password_hash: employeePassword,
      role: 'EMPLOYEE',
      is_active: true,
    });

    console.log('----------------------------------------------------');
    console.log('Seeding completed successfully!');
    console.log('Credentials:');
    console.log('  Admin:    admin@company.com     / Admin@123');
    console.log('  Manager:  manager@company.com   / Manager@123');
    console.log('  Employee: john.doe@company.com  / Employee@123');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seed();
