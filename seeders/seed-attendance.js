/**
 * seed-attendance.js
 *
 * Safe seed — only inserts into company_off_days and attendance_exceptions.
 * Does NOT drop or alter any existing tables.
 * Run: node server/seeders/seed-attendance.js  (from project root)
 *   or: npm run seed:attendance
 *
 * Re-running is safe: duplicate dates are silently skipped.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize, CompanyOffDay, AttendanceException, User } = require('../models');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns every Sunday in a given YYYY-MM month as 'YYYY-MM-DD' strings */
const sundaysInMonth = (year, month) => {
  const days = [];
  const d = new Date(year, month - 1, 1);
  // advance to first Sunday
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  while (d.getMonth() === month - 1) {
    days.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 7);
  }
  return days;
};

/** Returns 'YYYY-MM-DD' for today offset by N days */
const offset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const today = new Date();
const thisYear  = today.getFullYear();
const thisMonth = today.getMonth() + 1;                        // 1-12
const prevMonth = thisMonth === 1 ? 12 : thisMonth - 1;
const prevYear  = thisMonth === 1 ? thisYear - 1 : thisYear;

// ── Main ──────────────────────────────────────────────────────────────────────

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database.');

    // ── 1. Find the admin user to use as creator/marker ───────────────────────
    const admin = await User.findOne({ where: { role: 'ADMIN' } });
    if (!admin) {
      console.error('✗ No ADMIN user found. Run the main seed first.');
      process.exit(1);
    }
    console.log(`  Using admin: ${admin.first_name} ${admin.last_name} (${admin.id})`);

    // ── 2. Find employee users for absence examples ───────────────────────────
    const employees = await User.findAll({
      where: { role: 'EMPLOYEE', is_active: true },
      order: [['first_name', 'ASC']],
    });
    if (employees.length === 0) {
      console.warn('  No active employees found — skipping absence records.');
    }

    // ── 3. Build off-day entries ──────────────────────────────────────────────

    // All Sundays in the current month
    const currentSundays = sundaysInMonth(thisYear, thisMonth).map(date => ({
      date,
      type: 'SUNDAY',
      reason: 'Weekly off',
      created_by: admin.id,
    }));

    // All Sundays in the previous month
    const prevSundays = sundaysInMonth(prevYear, prevMonth).map(date => ({
      date,
      type: 'SUNDAY',
      reason: 'Weekly off',
      created_by: admin.id,
    }));

    // Two specific Saturdays this month (1st and 3rd Saturday as example)
    const saturdayDates = (() => {
      const sats = [];
      const d = new Date(thisYear, thisMonth - 1, 1);
      while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
      // 1st Saturday
      if (d.getMonth() === thisMonth - 1) {
        sats.push(d.toISOString().split('T')[0]);
        // 3rd Saturday (skip 2 more weeks)
        const third = new Date(d);
        third.setDate(third.getDate() + 14);
        if (third.getMonth() === thisMonth - 1) {
          sats.push(third.toISOString().split('T')[0]);
        }
      }
      return sats;
    })();

    const saturdayEntries = saturdayDates.map(date => ({
      date,
      type: 'SATURDAY',
      reason: '1st & 3rd Saturday off',
      created_by: admin.id,
    }));

    // One public holiday: 10 days from now (sample)
    const holidayDate = offset(10);
    const holidayEntries = [
      {
        date: holidayDate,
        type: 'PUBLIC_HOLIDAY',
        reason: 'National / Public Holiday',
        created_by: admin.id,
      },
    ];

    const allOffDays = [...prevSundays, ...currentSundays, ...saturdayEntries, ...holidayEntries];

    // Insert, skipping duplicates
    let addedOff = 0;
    let skippedOff = 0;
    for (const entry of allOffDays) {
      const exists = await CompanyOffDay.findOne({ where: { date: entry.date } });
      if (exists) { skippedOff++; continue; }
      await CompanyOffDay.create(entry);
      addedOff++;
    }
    console.log(`✓ Off days: ${addedOff} added, ${skippedOff} already existed.`);

    // ── 4. Build attendance exception examples ────────────────────────────────
    if (employees.length > 0) {
      const emp1 = employees[0];
      const emp2 = employees.length > 1 ? employees[1] : employees[0];

      // Find a recent weekday that isn't an off-day for the absence example
      const recentWorkday = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 2); // 2 days ago
        // step back past weekends
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
      })();

      const anotherWorkday = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 4);
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
      })();

      const exceptionEntries = [
        {
          employee_id: emp1.id,
          date: recentWorkday,
          type: 'ABSENT',
          reason: 'Unplanned absence (sample)',
          marked_by: admin.id,
        },
        {
          employee_id: emp2.id,
          date: anotherWorkday,
          type: 'LEAVE',
          reason: 'Medical leave (sample)',
          marked_by: admin.id,
        },
      ];

      let addedEx = 0;
      let skippedEx = 0;
      for (const entry of exceptionEntries) {
        const exists = await AttendanceException.findOne({
          where: { employee_id: entry.employee_id, date: entry.date },
        });
        if (exists) { skippedEx++; continue; }
        await AttendanceException.create(entry);
        addedEx++;
      }
      console.log(`✓ Attendance exceptions: ${addedEx} added, ${skippedEx} already existed.`);
      console.log(`  → ${emp1.first_name} ${emp1.last_name}: Absent on ${recentWorkday}`);
      if (emp2.id !== emp1.id) {
        console.log(`  → ${emp2.first_name} ${emp2.last_name}: Leave on ${anotherWorkday}`);
      }
    }

    // ── 5. Summary ────────────────────────────────────────────────────────────
    const totalOff = await CompanyOffDay.count();
    const totalEx  = await AttendanceException.count();

    console.log('');
    console.log('────────────────────────────────────────────────');
    console.log('Attendance seed complete!');
    console.log(`  company_off_days      : ${totalOff} total rows`);
    console.log(`  attendance_exceptions : ${totalEx} total rows`);
    console.log('');
    console.log('Go to Admin → Attendance & Off Days to review.');
    console.log('Go to Admin → Submission Timeline to see the effect.');
    console.log('────────────────────────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('✗ Seed error:', err.message);
    process.exit(1);
  }
};

seed();
