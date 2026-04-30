export type ProjectLinkType = 'github' | 'website';

export interface ProjectImage {
  src: string;
  alt: string;
  priority?: boolean;
}

export interface ProjectLink {
  href: string;
  text: string;
  type: ProjectLinkType;
}

export interface Project {
  title: string;
  technologies: string[];
  images: ProjectImage[];
  link?: ProjectLink;
}

export const FIRST_PROJECT_IS_DARK = false;

export const projects: Project[] = [
  {
    title: 'Wingbox',
    technologies: ['Next.js', 'Fiber (Go)', 'PostgreSQL'],
    images: [
      { src: '/images/wingbox-home.png', alt: 'Wingbox Home Page', priority: true },
      { src: '/images/wingbox-calculator.png', alt: 'Wingbox Calculator Interface' },
      { src: '/images/wingbox-track.png', alt: 'Wingbox Tracking System' },
      { src: '/images/wingbox-about.png', alt: 'About Wingbox' },
      { src: '/images/wingbox-login.png', alt: 'Wingbox Login Page' },
    ],
    link: {
      href: 'https://wingbox.id',
      text: 'Website',
      type: 'website',
    },
  },
  {
    title: 'Pura Pura Bike',
    technologies: ['Next.js', 'Tailwind CSS'],
    images: [
      { src: '/images/pura-pura-bike-1.png', alt: 'Pura Pura Bike Hero', priority: true },
      { src: '/images/pura-pura-bike-2.png', alt: 'Pura Pura Bike Kegiatan Rutin' },
      { src: '/images/pura-pura-bike-3.png', alt: 'Pura Pura Bike Kolaborator' },
      { src: '/images/pura-pura-bike-4.png', alt: 'Pura Pura Bike Statistik Kami' },
      { src: '/images/pura-pura-bike-5.png', alt: 'Pura Pura Bike Hubungi Kami' },
    ],
    link: {
      href: 'https://pura-pura-bike.vercel.app/',
      text: 'Website',
      type: 'website',
    },
  },
  {
    title: 'Pulse AI',
    technologies: ['Next.js', 'Tailwind CSS', 'Prisma', 'PostgreSQL'],
    images: [
      { src: '/images/pulse-ai-1.png', alt: 'Pulse AI Hero', priority: true },
      { src: '/images/pulse-ai-2.png', alt: 'Pulse AI Dashboard' },
      { src: '/images/pulse-ai-3.png', alt: 'Pulse AI Create Campaign' },
      { src: '/images/pulse-ai-4.png', alt: 'Pulse AI Ad Accounts' },
      { src: '/images/pulse-ai-5.png', alt: 'Pulse AI Ad Account Details' },
    ],
    link: {
      href: 'https://pulse.technovasolusi.id/',
      text: 'Website',
      type: 'website',
    },
  },
  {
    title: 'GEP Media',
    technologies: ['Nextjs', 'Tailwind CSS', 'Prisma', 'PostgreSQL'],
    images: [
      { src: '/images/gepmedia-1.png', alt: 'GEP Hero', priority: true },
      { src: '/images/gepmedia-2.png', alt: 'GEP Dashboard' },
      { src: '/images/gepmedia-3.png', alt: 'GEP Ebook' },
      { src: '/images/gepmedia-4.png', alt: 'GEP QR Attendance' },
    ],
    link: {
      href: 'https://www.gepmedia.id/',
      text: 'Website',
      type: 'website',
    },
  },
  {
    title: 'RSMS Emotion Shareflow',
    technologies: ['Django', 'PostgreSQL', 'jQuery', 'Bootstrap'],
    images: [
      { src: '/images/rsms-1.png', alt: 'RSMS Hero', priority: true },
      { src: '/images/rsms-2.png', alt: 'RSMS Dashboard 1' },
      { src: '/images/rsms-3.png', alt: 'RSMS Dashboard 2' },
      { src: '/images/rsms-4.png', alt: 'RSMS Revenue Summary 1' },
      { src: '/images/rsms-5.png', alt: 'RSMS Revenue Summary 2' },
    ],
    link: {
      href: 'https://rsms.technovasolusi.id/',
      text: 'Website',
      type: 'website',
    },
  },
  {
    title: 'Intermedia Prima Vision',
    technologies: ['Javascript', 'HTML', 'Tailwind CSS'],
    images: [
      { src: '/images/ipvision.png', alt: 'Intermedia Prima Vision Home Page', priority: true },
    ],
    link: {
      href: 'https://ipvision.id/',
      text: 'Website',
      type: 'website',
    },
  },
  {
    title: 'Heetung',
    technologies: ['Flutter', 'Dart'],
    images: [
      { src: '/images/heetung-1.png', alt: 'Heetung Main Screen', priority: true },
      { src: '/images/heetung-2.png', alt: 'Heetung Settings Screen' },
      { src: '/images/heetung-3.png', alt: 'Heetung Subcounter Dialog' },
      { src: '/images/heetung-4.png', alt: 'Heetung Main Screen With Subcounter' },
      { src: '/images/heetung-5.png', alt: 'Heetung Main Screen Dark' },
    ],
  },
  {
    title: 'Sembunyi Social',
    technologies: ['Flutter', 'Dart'],
    images: [
      { src: '/images/sembunyi-social-1.png', alt: 'Sembunyi Social Main Screen', priority: true },
      { src: '/images/sembunyi-social-2.png', alt: 'Sembunyi Social Direct Message Screen' },
      { src: '/images/sembunyi-social-3.png', alt: 'Sembunyi Social Notification Screen' },
      { src: '/images/sembunyi-social-4.png', alt: 'Sembunyi Social Settings Screen' },
    ],
  },
  {
    title: 'Castle Journey',
    technologies: ['Unity', 'C#'],
    images: [
      { src: '/images/main-menu.png', alt: 'Castle Journey Main Menu' },
      { src: '/images/world-1.png', alt: 'Castle Journey World 1' },
      { src: '/images/world-2.png', alt: 'Castle Journey World 2' },
      { src: '/images/boss.png', alt: 'Castle Journey Boss Battle' },
    ],
    link: {
      href: 'https://github.com/DartedMonki/castle-journey',
      text: 'Github Repository',
      type: 'github',
    },
  },
];

export const portfolioProjects = projects.map((project, index) => ({
  ...project,
  isDark: index % 2 === 0 ? FIRST_PROJECT_IS_DARK : !FIRST_PROJECT_IS_DARK,
}));
