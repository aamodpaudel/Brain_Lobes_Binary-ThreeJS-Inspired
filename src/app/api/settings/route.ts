import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';

export async function GET() {
    try {
        let settings = await prisma.globalSettings.findFirst();

        if (!settings) {
            settings = await prisma.globalSettings.create({
                data: {
                    title: 'My Mind In A Box',
                    tagline: 'A maths & physics enthusiast, programmer, and a curious human being.',
                    bio: '',
                    email: '',
                },
            });
        }

        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch global settings' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();

        const settings = await prisma.globalSettings.update({
            where: { id: data.id },
            data: {
                title: data.title,
                tagline: data.tagline,
                email: data.email,
                bio: data.bio,
                githubUrl: data.githubUrl || null,
                linkedinUrl: data.linkedinUrl || null,
                twitterUrl: data.twitterUrl || null,
                vscoUrl: data.vscoUrl || null,
            },
        });

        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ error: 'Failed to update global settings' }, { status: 500 });
    }
}
