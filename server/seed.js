const bcrypt = require('bcrypt');
require('dotenv').config();

const connectDB = require('./config/db');
const User = require('./models/User');
const Task = require('./models/Task');

const seed = async () => {
  try {
    console.log('Starting MongoDB seeding...');
    await connectDB();

    const hashedPwd = await bcrypt.hash('password123', 10);

    // Upsert all 4 users
    const [admin, teamLead, worker1, worker2] = await Promise.all([
      User.findOneAndUpdate(
        { username: 'admin@sevasetu.gov.in' },
        {
          fullName: 'Suresh Admin',
          username: 'admin@sevasetu.gov.in',
          password: hashedPwd,
          role: 'ADMIN'
        },
        { upsert: true, new: true }
      ),
      User.findOneAndUpdate(
        { username: 'lead@sevasetu.gov.in' },
        {
          fullName: 'Vikram Lead',
          username: 'lead@sevasetu.gov.in',
          password: hashedPwd,
          role: 'TEAM_LEAD'
        },
        { upsert: true, new: true }
      ),
      User.findOneAndUpdate(
        { username: 'worker@sevasetu.gov.in' },
        {
          fullName: 'Rahul Worker',
          username: 'worker@sevasetu.gov.in',
          password: hashedPwd,
          role: 'FIELD_WORKER',
          faceImagePath: null,
          faceEncoding: null
        },
        { upsert: true, new: true }
      ),
      User.findOneAndUpdate(
        { username: 'anjali@sevasetu.gov.in' },
        {
          fullName: 'Anjali Field',
          username: 'anjali@sevasetu.gov.in',
          password: hashedPwd,
          role: 'FIELD_WORKER',
          faceImagePath: null,
          faceEncoding: null
        },
        { upsert: true, new: true }
      ),
    ]);

    // Today's date — time set to midnight so date comparison works
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Time window: starts now, ends 8 hours from now
    // Using wide buffer (120 min) so you can test anytime today
    const now = new Date();
    const later = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const timeStr = (d) => d.toTimeString().slice(0, 5);

    await Promise.all([
      Task.findOneAndUpdate(
        { title: 'Beach Cleanliness Survey' },
        {
          title: 'Beach Cleanliness Survey',
          description: 'Assess the cleanliness of Juhu beach after morning hours.',
          locationName: 'Juhu Beach',
          latitude: 19.0988,
          longitude: 72.8264,
          allowedRadius: 50000,    // 50km — very wide so GPS always passes
          date: today,             // midnight — clean date comparison
          startTime: timeStr(now),
          endTime: timeStr(later),
          workType: 'Waste Collection',
          checkInBuffer: 120,      // 2hr buffer — test anytime
          checkOutBuffer: 120,
          createdBy: teamLead._id,
          assignedWorkers: [worker1._id],
          status: 'ACTIVE',
          isDeleted: false
        },
        { upsert: true, new: true }
      ),
      Task.findOneAndUpdate(
        { title: 'Monument Site Inspection' },
        {
          title: 'Monument Site Inspection',
          description: 'Security and maintenance check at Gateway.',
          locationName: 'Gateway of India',
          latitude: 18.9220,
          longitude: 72.8347,
          allowedRadius: 50000,
          date: today,
          startTime: timeStr(now),
          endTime: timeStr(later),
          workType: 'Inspection',
          checkInBuffer: 120,
          checkOutBuffer: 120,
          createdBy: teamLead._id,
          assignedWorkers: [worker2._id],
          status: 'ACTIVE',
          isDeleted: false
        },
        { upsert: true, new: true }
      ),
    ]);

    console.log('Seeding complete!');
    console.log('─────────────────────────────');
    console.log('Login credentials:');
    console.log('FIELD_WORKER → worker@sevasetu.gov.in / password123');
    console.log('FIELD_WORKER → anjali@sevasetu.gov.in / password123');
    console.log('TEAM_LEAD    → lead@sevasetu.gov.in   / password123');
    console.log('ADMIN        → admin@sevasetu.gov.in  / password123');
    console.log('─────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
