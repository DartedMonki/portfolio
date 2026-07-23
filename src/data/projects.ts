import type { Locale } from './locales';

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
  description: Record<Locale, string>;
  technologies: string[];
  images: ProjectImage[];
  link?: ProjectLink;
}

export type LocalizedProject = Omit<Project, 'description'> & { description: string };

export const FIRST_PROJECT_IS_DARK = false;

export const projects: Project[] = [
  {
    title: 'Prime Education Center',
    description: {
      en: 'A bilingual education platform for schools, foundations, and families, with B2B and B2C learning experiences managed through Payload CMS.',
      id: 'Platform pendidikan bilingual untuk sekolah, yayasan, dan keluarga, dengan pengalaman belajar B2B dan B2C yang dikelola melalui Payload CMS.',
    },
    technologies: ['Next.js', 'Payload CMS', 'Tailwind CSS'],
    images: [
      { src: '/images/prime-edu-center-1.png', alt: 'Prime Education Center bilingual landing page', priority: true },
      { src: '/images/prime-edu-center-2.png', alt: 'Prime Education Center B2B landing page' },
      { src: '/images/prime-edu-center-3.png', alt: 'Prime Education Center B2C landing page' },
      { src: '/images/prime-edu-center-4.png', alt: 'Prime Education Center curriculum approach' },
      { src: '/images/prime-edu-center-5.png', alt: 'Prime Education Center home learning catalogue' },
      { src: '/images/prime-edu-center-6.png', alt: 'Prime Education Center Payload CMS media library' },
      { src: '/images/prime-edu-center-7.png', alt: 'Prime Education Center Payload CMS landing page editor' },
    ],
    link: {
      href: 'https://primeeducenter.com/',
      text: 'Website',
      type: 'website',
    },
  },
  {
    title: 'Wingbox',
    description: {
      en: 'A delivery and shipment-tracking platform built with a Next.js frontend, Go, and PostgreSQL for reliable logistics operations.',
      id: 'Platform pengiriman dan pelacakan paket yang dibangun dengan frontend Next.js, Go, dan PostgreSQL untuk mendukung operasional logistik yang andal.',
    },
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
    description: {
      en: 'A responsive community website for a cycling group, designed to present activities, collaborations, statistics, and contact information clearly.',
      id: 'Situs komunitas responsif untuk grup bersepeda, dirancang untuk menampilkan aktivitas, kolaborasi, statistik, dan informasi kontak dengan jelas.',
    },
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
    description: {
      en: 'An advertising and campaign management dashboard using Next.js, Prisma, and PostgreSQL to organize ad accounts and campaign workflows.',
      id: 'Dashboard pengelolaan iklan dan kampanye yang menggunakan Next.js, Prisma, dan PostgreSQL untuk mengatur akun iklan serta alur kerja kampanye.',
    },
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
    description: {
      en: 'A media and education platform with dashboard, ebook, Learning Management System (LMS), and QR attendance features implemented with Next.js, Prisma, and PostgreSQL.',
      id: 'Platform media dan edukasi dengan dashboard, ebook, Learning Management System (LMS), dan fitur absensi QR, dibangun menggunakan Next.js, Prisma, dan PostgreSQL.',
    },
    technologies: ['Next.js', 'Tailwind CSS', 'Prisma', 'PostgreSQL'],
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
    description: {
      en: 'A Django-based dashboard for revenue summaries and operational reporting, backed by PostgreSQL and a Bootstrap interface.',
      id: 'Dashboard berbasis Django untuk ringkasan pendapatan dan pelaporan operasional, didukung PostgreSQL dan antarmuka Bootstrap.',
    },
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
    description: {
      en: 'A company profile website built with JavaScript, HTML, and Tailwind CSS to present services and business information.',
      id: 'Situs profil perusahaan yang dibangun dengan JavaScript, HTML, dan Tailwind CSS untuk menampilkan layanan serta informasi bisnis.',
    },
    technologies: ['JavaScript', 'HTML', 'Tailwind CSS'],
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
    description: {
      en: 'A Flutter counter application with subcounter support, settings, and dark-mode interfaces for mobile productivity use cases.',
      id: 'Aplikasi pencatat hitungan berbasis Flutter dengan dukungan subcounter, pengaturan, dan tampilan mode gelap untuk kebutuhan produktivitas di perangkat mobile.',
    },
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
    description: {
      en: 'A Flutter social app prototype covering main feed, direct messages, notifications, and settings screens.',
      id: 'Prototipe aplikasi sosial berbasis Flutter yang mencakup layar feed utama, pesan langsung, notifikasi, dan pengaturan.',
    },
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
    description: {
      en: 'A Unity and C# game project featuring menu flow, world scenes, and boss-battle gameplay experimentation.',
      id: 'Proyek game Unity dan C# yang mengeksplorasi alur menu, scene dunia permainan, dan gameplay pertarungan bos.',
    },
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

export const getPortfolioProjects = (locale: Locale) =>
  projects.map((project, index) => ({
    ...project,
    description: project.description[locale],
    isDark: index % 2 === 0 ? FIRST_PROJECT_IS_DARK : !FIRST_PROJECT_IS_DARK,
  }));
