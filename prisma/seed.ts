import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Create Admin
    await prisma.admin.upsert({
        where: { email: 'contact@aamodpaudel.com.np' },
        update: {},
        create: {
            email: 'contact@aamodpaudel.com.np',
            password: '@Infinityspectrum0', // In production, we'd hash this. Given it's a minimal simple app, we're using it as-is or we should hash it. Let's hash it via bcrypt or assume simple equality if asked. The prompt asked for simple credential. 
        },
    });

    // Seeds based on resume
    const sections = [
        // Left sections
        { side: 'LEFT', title: 'Coursework', content: 'OOP (C++), Discrete Math, Behavioral Psychology, Data Structures & Algorithms, Probability & Statistics, Calculus I & II, Cognitive Neuroscience, University Physics I & II... NSF Access Program Fellow (20 hrs/wk): Deep learning research in assistive & behavioral diagnostics', iconType: 'math', order: 1 },
        { side: 'LEFT', title: 'ML Experiences', content: 'ML Operations Summer Intern | Careerlink AI (NVIDIA & AWS-backed) Boston, MA May 2025 – August 2025\nDeep Learning Research Intern | NJBDA Data Science Research Lab, NSF Access Program HPC Rutgers, NJ July 2024 – May 2025', iconType: 'ann', order: 2 },
        { side: 'LEFT', title: 'Technical Skills', content: 'Assistive Technology: PyTorch, TensorFlow, Scikit-learn, OpenCV... MLOps & Infrastructure: Docker, Kubernetes, Terraform... API & Workflow Automation: LangChain, FastAPI...', iconType: 'code', order: 3 },
        { side: 'LEFT', title: 'Publications', content: 'Computational Research: Corresponding Author', iconType: 'book', order: 4 },
        { side: 'LEFT', title: 'Certifications', content: 'Details missing from resume short form, placeholder here.', iconType: 'progress', order: 5 },
        // Right sections
        { side: 'RIGHT', title: 'Accessibility Projects', content: 'Non-Verbal Sentiment Analysis via CNN-ViT... ARISE: AI-Powered Accessible Virtual Laboratory via Gesture & Voice-Controlled Commands...', iconType: 'access', order: 1 },
        { side: 'RIGHT', title: 'Leadership & Recognition', content: 'Global Winner, Phoenix Space Launchpad Challenge... Honored as Nepal\'s 20 Under 20...', iconType: 'medal', order: 2 },
        { side: 'RIGHT', title: 'Blogs', content: 'Placeholder for blogs', iconType: 'blog', order: 3 },
        { side: 'RIGHT', title: 'Manim Animations', content: 'Placeholder for Manim animations mentioned in resume.', iconType: 'animation', order: 4 },
        { side: 'RIGHT', title: 'Philosophy/Arts', content: 'Placeholder for Philosophy and Arts section.', iconType: 'art', order: 5 },
    ];

    for (const s of sections) {
        const existing = await prisma.contentSection.findFirst({
            where: { title: s.title, side: s.side }
        });
        if (!existing) {
            await prisma.contentSection.create({ data: s });
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
