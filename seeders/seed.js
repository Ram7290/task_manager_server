const bcrypt = require('bcryptjs');
const { sequelize, User, Department } = require('../models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database. Syncing tables...');
    await sequelize.sync({ force: true });
    console.log('Tables synced.');

    console.log('Seeding Departments...');
    const accounts = await Department.create({ name: 'Accounts' });
    const development = await Department.create({ name: 'Development' });
    const digitalMarketing = await Department.create({ name: 'Digital Marketing' });

    console.log('Seeding Users...');
    const people = [
      { first_name: 'Afzal', last_name: 'Admin', email: 'afzal@taiqontech.com', role: 'ADMIN', department: null },
      { first_name: 'Ashref', last_name: 'Admin', email: 'ashref@taiqontech.com', role: 'ADMIN', department: null },
      { first_name: 'Anoop', last_name: 'Admin', email: 'anoop@taiqontech.com', role: 'ADMIN', department: null },
      { first_name: 'Karthika', last_name: 'Employee', email: 'karthika@taiqontech.com', role: 'EMPLOYEE', department: accounts },
      { first_name: 'Asna', last_name: 'Employee', email: 'asna@taiqontech.com', role: 'EMPLOYEE', department: accounts },
      { first_name: 'Durga', last_name: 'Employee', email: 'durga@taiqontech.com', role: 'EMPLOYEE', department: development },
      { first_name: 'Ram', last_name: 'Employee', email: 'ram@taiqontech.com', role: 'EMPLOYEE', department: development },
      { first_name: 'Althaf', last_name: 'Employee', email: 'althaf@taiqontech.com', role: 'EMPLOYEE', department: digitalMarketing },
    ];

    for (const p of people) {
      const password_hash = await bcrypt.hash(`${p.first_name}@123`, 10);
      await User.create({
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        password_hash,
        role: p.role,
        department_id: p.department ? p.department.id : null,
        is_active: true,
      });
    }

    console.log('----------------------------------------------------');
    console.log('Seeding completed successfully!');
    console.log('Departments: Accounts, Development, Digital Marketing');
    console.log('Users (password = FirstName@123):');
    for (const p of people) {
      console.log(`  ${p.role.padEnd(8)} ${p.email.padEnd(28)} / ${p.first_name}@123`);
    }
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seed();
