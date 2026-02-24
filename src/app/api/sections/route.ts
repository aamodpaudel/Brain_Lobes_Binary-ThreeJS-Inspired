import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to verify admin password
async function verifyAdminPassword(password: string) {
    if (!password) return false;
    const admin = await prisma.admin.findFirst();
    if (!admin) return false;
    return admin.password === password;
}

export async function GET() {
    try {
        const sections = await prisma.contentSection.findMany({
            orderBy: [
                { side: 'asc' },
                { order: 'asc' },
            ],
        });
        return NextResponse.json(sections);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();

        const isValid = await verifyAdminPassword(data.adminPassword);
        if (!isValid) return NextResponse.json({ error: 'Invalid admin password confirmation' }, { status: 403 });

        const section = await prisma.contentSection.create({
            data: {
                side: data.side,
                title: data.title,
                content: data.content,
                isGlobalProfile: data.isGlobalProfile === true || data.isGlobalProfile === 'true',
                order: parseInt(data.order, 10) || 0,
            }
        });
        return NextResponse.json(section);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const data = await req.json();

        const isValid = await verifyAdminPassword(data.adminPassword);
        if (!isValid) return NextResponse.json({ error: 'Invalid admin password confirmation' }, { status: 403 });

        const section = await prisma.contentSection.update({
            where: { id: data.id },
            data: {
                side: data.side,
                title: data.title,
                content: data.content,
                isGlobalProfile: data.isGlobalProfile === true || data.isGlobalProfile === 'true',
                order: parseInt(data.order, 10) || 0,
            }
        });
        return NextResponse.json(section);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const data = await req.json();

        const isValid = await verifyAdminPassword(data.adminPassword);
        if (!isValid) return NextResponse.json({ error: 'Invalid admin password confirmation' }, { status: 403 });

        await prisma.contentSection.delete({
            where: { id: data.id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
    }
}
