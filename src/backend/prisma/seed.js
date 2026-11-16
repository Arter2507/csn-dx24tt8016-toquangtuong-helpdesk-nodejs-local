import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** bcrypt hash của chuỗi "password" — chỉ dùng cho seed local/demo */
const PASSWORD_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

async function main() {
  const now = new Date();

  await prisma.role.createMany({
    data: [
      { id: 1n, code: 'USER', name: 'Người dùng' },
      { id: 2n, code: 'TECHNICIAN', name: 'Chuyên viên kỹ thuật' },
      { id: 3n, code: 'ADMIN', name: 'Quản trị viên' },
    ],
    skipDuplicates: true,
  });

  await prisma.category.createMany({
    data: [
      { id: 1n, code: 'SOFTWARE', name: 'Phần mềm', isActive: true, createdAt: now, updatedAt: now },
      { id: 2n, code: 'HARDWARE', name: 'Phần cứng', isActive: true, createdAt: now, updatedAt: now },
      { id: 3n, code: 'NETWORK', name: 'Mạng', isActive: true, createdAt: now, updatedAt: now },
      { id: 4n, code: 'ACCOUNT', name: 'Tài khoản', isActive: true, createdAt: now, updatedAt: now },
    ],
    skipDuplicates: true,
  });

  const users = [
    {
      id: 1n,
      email: 'user@example.test',
      passwordHash: PASSWORD_HASH,
      fullName: 'Người gửi mẫu',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2n,
      email: 'tech@example.test',
      passwordHash: PASSWORD_HASH,
      fullName: 'Kỹ thuật viên mẫu',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3n,
      email: 'admin@example.test',
      passwordHash: PASSWORD_HASH,
      fullName: 'Quản trị mẫu',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: user,
      update: {
        passwordHash: user.passwordHash,
        fullName: user.fullName,
        isActive: user.isActive,
        updatedAt: now,
      },
    });
  }

  await prisma.userRole.createMany({
    data: [
      { userId: 1n, roleId: 1n, createdAt: now },
      { userId: 2n, roleId: 1n, createdAt: now },
      { userId: 2n, roleId: 2n, createdAt: now },
      { userId: 3n, roleId: 1n, createdAt: now },
      { userId: 3n, roleId: 3n, createdAt: now },
    ],
    skipDuplicates: true,
  });

  await prisma.technicianCategory.createMany({
    data: [
      { userId: 2n, categoryId: 1n, createdAt: now },
      { userId: 2n, categoryId: 2n, createdAt: now },
      { userId: 2n, categoryId: 3n, createdAt: now },
      { userId: 2n, categoryId: 4n, createdAt: now },
    ],
    skipDuplicates: true,
  });

  console.log('Seed xong. Tài khoản demo dùng mật khẩu: password');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
