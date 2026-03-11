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
        let settings = await prisma.globalSettings.findFirst();

        // If DB is empty, auto-seed defaults once using the exact strings user provided
        if (!settings) {
            settings = await prisma.globalSettings.create({
                data: {
                    title: "Zenaamod",
                    subtitle: "ML Infrastructure & Assistive Technology for Neurodiversity & Disability",
                    email: "hello [at] zenaamod [dot] com",
                    bio: "Hello there! I am a researcher and engineer.\n\nAn aspiring computational scientist with an inclination for 'Why?' queries, Aamod has a nickname with Latin origin, yet there's nothing Latin in particular about himself. He enjoys his spare time analyzing extensive amounts of photometric datasets, often from exoplanetary or celestial systems.\n\nAs a keen explorer of simulations and data modeling, he engages in the development of web-based graphical calculators, dissecting every miniature detail on curves, plots, figures, and symmetries. His recent projects focus on numerical algorithms that include both stochastic and deterministic conditions.\n\nHe is also a minimalist skeptic, who is fond of collecting scientific books and even has a mini library in his room. You could find him having philosophical discussions on wide range of topics, including metaphysics, rationality, the history of science, consciousness, and quantum mechanics. Besides that, every morning, he engages in various meditation practices inspired by the likes of Sutta Pitaka (Buddhism) and Upanishads (Advaita Vedanta).\n\nFeel free to connect with him for collaborative projects as well as short talk sessions.",
                    instructions: "Interact with the Interactive Brain below to explore my background.",
                    instructionsBottom: "Hover and click over the 5 distinct regions (Frontal, Parietal, Occipital, Temporal, Cerebellum) to view related projects, experiences, and coursework spanning both hemispheres simultaneously."
                }
            });
        } else if (!settings.instructionsBottom) {
            // Hotfix: if migration locked due to dev server, artificially default it 
            settings.instructionsBottom = "Hover and click over the 5 distinct regions (Frontal, Parietal, Occipital, Temporal, Cerebellum) to view related projects, experiences, and coursework spanning both hemispheres simultaneously.";
        }

        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch global settings' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const data = await req.json();

        const isValid = await verifyAdminPassword(data.adminPassword);
        if (!isValid) return NextResponse.json({ error: 'Invalid admin password confirmation' }, { status: 403 });

        const settings = await prisma.globalSettings.update({
            where: { id: data.id },
            data: {
                title: data.title,
                subtitle: data.subtitle,
                email: data.email,
                bio: data.bio,
                instructions: data.instructions,
                instructionsBottom: data.instructionsBottom || "",
                githubUrl: data.githubUrl || null,
                linkedinUrl: data.linkedinUrl || null,
                twitterUrl: data.twitterUrl || null,
            }
        });

        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update global settings' }, { status: 500 });
    }
}
