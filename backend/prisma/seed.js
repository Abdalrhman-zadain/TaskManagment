const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function upsertUser({ name, email, role, sectionId = null, passwordHash }) {
    return prisma.user.upsert({
        where: { email },
        update: {
            name,
            role,
            sectionId,
            password: passwordHash,
        },
        create: {
            name,
            email,
            role,
            sectionId,
            password: passwordHash,
        },
    });
}

async function main() {
    const defaultPassword = 'admin123';
    const passwordHash = await hashPassword(defaultPassword);

    const ceo = await upsertUser({
        name: 'CEO Admin',
        email: 'ceo@teamtask.com',
        role: 'CEO',
        passwordHash,
    });

    const manager = await upsertUser({
        name: 'Manager One',
        email: 'manager@teamtask.com',
        role: 'MANAGER',
        passwordHash,
    });

    const section = await prisma.section.upsert({
        where: { name: 'Engineering' },
        update: { managerId: manager.id },
        create: {
            name: 'Engineering',
            managerId: manager.id,
        },
    });

    await upsertUser({
        name: 'Manager One',
        email: 'manager@teamtask.com',
        role: 'MANAGER',
        sectionId: section.id,
        passwordHash,
    });

    const employee1 = await upsertUser({
        name: 'Employee One',
        email: 'employee1@teamtask.com',
        role: 'EMPLOYEE',
        sectionId: section.id,
        passwordHash,
    });

    const employee2 = await upsertUser({
        name: 'Employee Two',
        email: 'employee2@teamtask.com',
        role: 'EMPLOYEE',
        sectionId: section.id,
        passwordHash,
    });

    console.log('Seed complete.');
    console.log(`CEO: ${ceo.email} / ${defaultPassword}`);
    console.log('Manager: manager@teamtask.com / admin123');
    console.log('Employee: employee1@teamtask.com / admin123');
    console.log(`Section: ${section.name} (managerId=${section.managerId})`);
    console.log(`Employees: ${employee1.email}, ${employee2.email}`);
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
