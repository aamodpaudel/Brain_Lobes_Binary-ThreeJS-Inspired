# 3JS ZenAamod Portfolio

A personal 3D interactive portfolio website built with Next.js and Three.js. It features a stunning 3D brain model (using `@react-three/fiber` and `@react-three/drei`), smooth animations, and a rich user interface to showcase experience, projects, skills, and more.

## Technologies Used

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **3D Graphics**: [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction), [@react-three/drei](https://github.com/pmndrs/drei)
- **Animations**: [@react-spring/three](https://react-spring.dev/) & `@react-spring/web`
- **Database / ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: Modern CSS / CSS Modules
- **Language**: TypeScript

## Features

- **Interactive 3D Brain**: A captivating, interactive 3D model of a brain built using points and custom shaders.
- **Dynamic Content Loading**: Sections such as AI, BI, Experience, and Skills can be explored interactively.
- **Admin Dashboard**: Manage portfolio content intuitively (via secure API routes and Prisma DB integration).
- **Responsive Design**: Beautifully formatted to work across all devices with smooth performance.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aamodpaudel/3JS_ZenAamod_Portfolio.git
   cd 3JS_ZenAamod_Portfolio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   # To populate initial data
   npm run prisma:seed
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the portfolio.

## License

This project is licensed under the MIT License.
