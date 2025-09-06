import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database with sample data...');

  try {
    // Clear existing data
    await prisma.user.deleteMany();
    console.log('🗑️  Cleared existing users');

    // Create sample users with hashed passwords
    const saltRounds = 12;
    const samplePassword = 'password123'; // Well-known development password
    const passwordHash = await bcrypt.hash(samplePassword, saltRounds);

    const users = await prisma.user.createMany({
      data: [
        {
          username: 'john_doe',
          passwordHash: passwordHash,
        },
        {
          username: 'jane_smith',
          passwordHash: passwordHash,
        },
        {
          username: 'admin_user',
          passwordHash: passwordHash,
        },
      ],
    });

    console.log(`✅ Created ${users.count} sample users`);
    console.log('   • Usernames: john_doe, jane_smith, admin_user');
    console.log('   • Password: password123 (for all users)');

    // Verify data
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);

    console.log('');
    console.log('🎉 Database seeding complete!');
    console.log('You can now test the API with these sample users.');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
