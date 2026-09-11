import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DOMAIN_LIST } from '../src/lib/domains';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
        throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.');
    }

    await prisma.admin.upsert({
        where: { email: adminEmail },
        update: { passwordHash: await bcrypt.hash(adminPassword, 10) },
        create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10) },
    });

    const existingSettings = await prisma.globalSettings.findFirst();
    if (!existingSettings) {
        await prisma.globalSettings.create({
            data: {
                title: 'My Mind In A Box',
                tagline: 'A maths & physics enthusiast, programmer, and a curious human being.',
                bio: '<p>Welcome to my digital garden — a personal, ever-growing collection of notes across the things I spend my time thinking about. Click a lobe of the brain to wander in.</p>',
                email: '',
                githubUrl: null,
                linkedinUrl: null,
                twitterUrl: null,
                vscoUrl: null,
            },
        });
    }

    for (const d of DOMAIN_LIST) {
        await prisma.domainInfo.upsert({
            where: { domain: d.key },
            update: {},
            create: {
                domain: d.key,
                order: d.order,
                label: d.label,
                tagline: DEFAULT_TAGLINES[d.key],
                description: DEFAULT_DESCRIPTIONS[d.key],
                colorHex: DEFAULT_COLORS[d.key],
            },
        });
    }

    const noteIds: Record<string, number> = {};
    for (const seed of NOTE_SEEDS) {
        const note = await prisma.note.upsert({
            where: { domain_slug: { domain: seed.domain, slug: seed.slug } },
            update: {},
            create: {
                domain: seed.domain,
                title: seed.title,
                slug: seed.slug,
                summary: seed.summary,
                content: seed.content,
                published: true,
            },
        });
        noteIds[seed.slug] = note.id;
    }

    for (const [aSlug, bSlug] of NOTE_LINK_SEEDS) {
        const a = noteIds[aSlug];
        const b = noteIds[bSlug];
        if (!a || !b) continue;
        const [fromId, toId] = a < b ? [a, b] : [b, a];
        await prisma.noteLink.upsert({
            where: { fromId_toId: { fromId, toId } },
            update: {},
            create: { fromId, toId },
        });
    }
}

const DEFAULT_TAGLINES: Record<string, string> = {
    PURE_MATHEMATICS: 'Structure, proof, and abstraction for their own sake.',
    THEORETICAL_PHYSICS: 'Chasing the equations underneath the universe.',
    COMPUTATIONAL_NEUROSCIENCE: 'Modeling the brain as a computing system.',
    PHILOSOPHY_LIFE: 'Questions worth sitting with.',
    APPLIED_AI: 'Building systems that learn.',
};

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
    PURE_MATHEMATICS: '<p>Notes on the maths I read and prove for fun — number theory, analysis, and the occasional detour into topology.</p>',
    THEORETICAL_PHYSICS: '<p>Classical mechanics, field theory, and the physics that shows up when you push an idea far enough.</p>',
    COMPUTATIONAL_NEUROSCIENCE: '<p>How brains might compute — spiking models, predictive coding, and the neuroscience behind modern AI.</p>',
    PHILOSOPHY_LIFE: '<p>Metaphysics, ethics, and the practice of living deliberately.</p>',
    APPLIED_AI: '<p>Machine learning systems I build, break, and write up.</p>',
};

const DEFAULT_COLORS: Record<string, string> = {
    PURE_MATHEMATICS: '#6d8dfb',
    THEORETICAL_PHYSICS: '#f7a35c',
    COMPUTATIONAL_NEUROSCIENCE: '#5cd6c0',
    PHILOSOPHY_LIFE: '#c792ea',
    APPLIED_AI: '#f06292',
};

const NOTE_SEEDS = [
    {
        domain: 'PURE_MATHEMATICS',
        slug: 'eulers-identity',
        title: "Euler's Identity",
        summary: 'The single equation tying together five fundamental constants.',
        content: "<p>Euler's identity, $e^{i\\pi} + 1 = 0$, connects $e$, $i$, $\\pi$, $1$, and $0$ in one line. It falls out of the Euler formula $e^{ix} = \\cos(x) + i\\sin(x)$ at $x = \\pi$.</p>",
    },
    {
        domain: 'PURE_MATHEMATICS',
        slug: 'proof-by-induction',
        title: 'Proof by Induction',
        summary: 'Why proving the base case and the step is enough for all natural numbers.',
        content: '<p>Induction proves a statement $P(n)$ for all natural $n$ by showing $P(0)$ holds, and that $P(k) \\implies P(k+1)$.</p>',
    },
    {
        domain: 'THEORETICAL_PHYSICS',
        slug: 'lagrangian-mechanics',
        title: 'Lagrangian Mechanics',
        summary: 'Reformulating classical mechanics around energy instead of force.',
        content: '<p>The Lagrangian $L = T - V$ (kinetic minus potential energy) leads to the Euler-Lagrange equation $\\frac{d}{dt}\\frac{\\partial L}{\\partial \\dot{q}} - \\frac{\\partial L}{\\partial q} = 0$, which reproduces Newtonian mechanics from a single scalar function.</p>',
    },
    {
        domain: 'THEORETICAL_PHYSICS',
        slug: 'double-pendulum-chaos',
        title: 'The Double Pendulum and Chaos',
        summary: 'A simple mechanical system with famously unpredictable motion.',
        content: '<p>Two pendulums joined end to end form a chaotic system: tiny changes in initial angle lead to wildly different trajectories, despite the equations of motion being fully deterministic.</p>',
    },
    {
        domain: 'COMPUTATIONAL_NEUROSCIENCE',
        slug: 'the-neuron-as-a-computer',
        title: 'The Neuron as a Computer',
        summary: 'Dendrites, somas, and axons as an information-processing pipeline.',
        content: '<p>A biological neuron integrates incoming signals at its dendrites, and if the summed input at the soma crosses a threshold, fires an action potential down the axon — a crude but useful analogy for the artificial neuron.</p>',
    },
    {
        domain: 'COMPUTATIONAL_NEUROSCIENCE',
        slug: 'predictive-coding',
        title: 'Predictive Coding',
        summary: 'The brain as a hierarchy of prediction-error minimizers.',
        content: '<p>Predictive coding theories propose the brain constantly predicts incoming sensory input and only propagates the <em>error</em> between prediction and reality upward — closely related to ideas in modern generative modeling.</p>',
    },
    {
        domain: 'PHILOSOPHY_LIFE',
        slug: 'the-ship-of-theseus',
        title: 'The Ship of Theseus',
        summary: 'What makes something the "same" thing over time?',
        content: '<p>If every plank of a ship is replaced over time, is it still the same ship? The puzzle probes what identity really means for anything that persists through change — including us.</p>',
    },
    {
        domain: 'PHILOSOPHY_LIFE',
        slug: 'stoicism-in-practice',
        title: 'Stoicism in Practice',
        summary: 'Separating what is in your control from what is not.',
        content: '<p>The Stoics argued peace of mind comes from focusing effort entirely on what is within your control — your judgments and actions — and accepting the rest.</p>',
    },
    {
        domain: 'APPLIED_AI',
        slug: 'gradient-descent',
        title: 'Gradient Descent',
        summary: 'The optimization workhorse behind most of modern machine learning.',
        content: '<p>Gradient descent updates parameters via $\\theta \\leftarrow \\theta - \\eta \\nabla_\\theta L(\\theta)$, iteratively stepping downhill on the loss surface until it settles near a minimum.</p>',
    },
    {
        domain: 'APPLIED_AI',
        slug: 'attention-mechanism',
        title: 'The Attention Mechanism',
        summary: 'How transformers decide what to focus on.',
        content: '<p>Attention computes a weighted sum over value vectors, with weights given by $\\text{softmax}(QK^T/\\sqrt{d_k})$ — letting a model dynamically focus on the most relevant parts of its input.</p>',
    },
];

const NOTE_LINK_SEEDS: [string, string][] = [
    ['eulers-identity', 'proof-by-induction'],
    ['lagrangian-mechanics', 'double-pendulum-chaos'],
    ['the-neuron-as-a-computer', 'predictive-coding'],
    ['the-ship-of-theseus', 'stoicism-in-practice'],
    ['gradient-descent', 'attention-mechanism'],
    ['predictive-coding', 'attention-mechanism'],
    ['gradient-descent', 'lagrangian-mechanics'],
];

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
