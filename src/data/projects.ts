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
    title: 'CSLatih',
    description: {
      en: 'A multi-workspace customer-service training platform with AI role-play exams, pre-test and post-test scoring, knowledge-grounded coaching, and AI-assisted module authoring. Each brand gets its own hostname, theme, and content, used here by HealthyGo and Bekelin.',
      id: 'Platform pelatihan customer service multi-workspace dengan ujian role-play AI, penilaian pre-test dan post-test, coaching berbasis pengetahuan, serta pembuatan modul berbantuan AI. Setiap brand memiliki hostname, tema, dan konten sendiri, digunakan oleh HealthyGo dan Bekelin.',
    },
    technologies: ['Next.js', 'React', 'Tailwind CSS', 'Prisma', 'PostgreSQL', 'Anthropic API'],
    images: [
      {
        src: '/images/cslatih-ai-chat.png',
        alt: 'CSLatih AI role-play exam chat for HealthyGo and Bekelin in mobile view with mock customer conversations',
        priority: true,
      },
      {
        src: '/images/cslatih-healthygo-dashboard.png',
        alt: 'CSLatih manager dashboard for HealthyGo with team scores, exam readiness, and agent progress',
      },
      {
        src: '/images/cslatih-healthygo-modules.png',
        alt: 'CSLatih module authoring for HealthyGo with AI draft generation and the active module list',
      },
      {
        src: '/images/cslatih-healthygo-knowledge.png',
        alt: 'CSLatih knowledge base for HealthyGo with required product, SOP, and policy documents',
      },
      {
        src: '/images/cslatih-bekelin-dashboard.png',
        alt: 'CSLatih manager dashboard for Bekelin with team scores, exam readiness, and agent progress',
      },
      {
        src: '/images/cslatih-bekelin-modules.png',
        alt: 'CSLatih module authoring for Bekelin with AI draft generation and the active module list',
      },
      {
        src: '/images/cslatih-bekelin-knowledge.png',
        alt: 'CSLatih knowledge base for Bekelin with required product, SOP, and policy documents',
      },
    ],
  },
  {
    title: 'Asianet Smart WFM',
    description: {
      en: 'A mobile workforce management app for field technicians, covering installation and maintenance work orders, site details, activity tracking, and field reporting.',
      id: 'Aplikasi mobile manajemen tenaga kerja lapangan untuk teknisi, mencakup work order instalasi dan pemeliharaan, detail lokasi, pelacakan aktivitas, serta pelaporan pekerjaan.',
    },
    technologies: ['Flutter', 'Dart', 'Riverpod', 'Go (Gin)', 'MySQL', 'Redis'],
    images: [
      {
        src: '/images/asianet-swfm-1.png',
        alt: 'Asianet Smart WFM ongoing work orders with installation and troubleshooting tasks',
        priority: true,
      },
      {
        src: '/images/asianet-swfm-2.png',
        alt: 'Asianet Smart WFM work order details with site, team, and schedule information',
      },
      {
        src: '/images/asianet-swfm-3.png',
        alt: 'Asianet Smart WFM installation work orders filtered by activity',
      },
    ],
  },
  {
    title: 'Asianet WFM Dashboard',
    description: {
      en: 'A workforce operations dashboard for coordinating installation and maintenance work orders, managing service sites and field teams, and monitoring completion trends by region, vendor, and device brand.',
      id: 'Dashboard operasional tenaga kerja untuk mengoordinasikan work order instalasi dan pemeliharaan, mengelola lokasi layanan serta tim lapangan, dan memantau tren penyelesaian berdasarkan wilayah, vendor, serta merek perangkat.',
    },
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Redux Toolkit',
      'RTK Query',
      'Recharts',
      'Go (Gin)',
      'MySQL',
      'Redis',
    ],
    images: [
      {
        src: '/images/asianet-wfm-dashboard-1.png',
        alt: 'Asianet WFM monthly analytics with work order totals, completion rates, and installation trends',
      },
      {
        src: '/images/asianet-wfm-dashboard-2.png',
        alt: 'Asianet WFM ongoing work orders with installation statuses, assigned technicians, and booking schedules',
      },
      {
        src: '/images/asianet-wfm-dashboard-3.png',
        alt: 'Asianet WFM service site directory with areas, client details, contacts, and active statuses',
      },
    ],
  },
  {
    title: 'GradePlus App',
    description: {
      en: 'A customer selfcare app for GRADE+ internet subscribers to monitor their connection, manage installations and orders, view bills, make payments, and contact support.',
      id: 'Aplikasi selfcare pelanggan internet GRADE+ untuk memantau koneksi, mengelola instalasi dan pesanan, melihat tagihan, melakukan pembayaran, serta menghubungi dukungan pelanggan.',
    },
    technologies: ['Flutter', 'Dart', 'Riverpod', 'Firebase', 'Go', 'gRPC', 'MariaDB', 'Kafka'],
    images: [
      {
        src: '/images/gradeplus-app-1.png',
        alt: 'GradePlus customer home with active internet package and network status',
      },
      {
        src: '/images/gradeplus-app-2.png',
        alt: 'GradePlus installation orders with package, location, and appointment details',
      },
      {
        src: '/images/gradeplus-app-3.png',
        alt: 'GradePlus billing overview with internet subscription invoices',
      },
    ],
    link: {
      href: 'https://app.gradeplus.id/',
      text: 'Website',
      type: 'website',
    },
  },
  {
    title: 'GradePlus Dashboard',
    description: {
      en: 'A reseller and operations portal for GRADE+, bringing customer management, sales leads, installation orders, product catalogues, invoicing, and payments into one permission-based dashboard.',
      id: 'Portal reseller dan operasional GRADE+ yang menyatukan pengelolaan pelanggan, prospek penjualan, pesanan instalasi, katalog produk, invoice, serta pembayaran dalam satu dashboard berbasis hak akses.',
    },
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'TanStack Query',
      'Go',
      'gRPC',
      'MariaDB',
      'Redis',
      'Kafka',
      'Keycloak',
    ],
    images: [
      {
        src: '/images/gradeplus-dashboard-1.png',
        alt: 'GradePlus operations dashboard with customer, order, and billing metrics',
      },
      {
        src: '/images/gradeplus-dashboard-2.png',
        alt: 'GradePlus customer directory with subscription packages and service statuses',
      },
      {
        src: '/images/gradeplus-dashboard-3.png',
        alt: 'GradePlus invoice management with payment statuses and billing filters',
      },
    ],
  },
  {
    title: 'Prime Education Center',
    description: {
      en: 'A bilingual education platform for schools, foundations, and families, with B2B and B2C learning experiences managed through Payload CMS.',
      id: 'Platform pendidikan bilingual untuk sekolah, yayasan, dan keluarga, dengan pengalaman belajar B2B dan B2C yang dikelola melalui Payload CMS.',
    },
    technologies: ['Next.js', 'Payload CMS', 'Tailwind CSS'],
    images: [
      {
        src: '/images/prime-edu-center-1.png',
        alt: 'Prime Education Center bilingual landing page',
        priority: true,
      },
      { src: '/images/prime-edu-center-2.png', alt: 'Prime Education Center B2B landing page' },
      { src: '/images/prime-edu-center-3.png', alt: 'Prime Education Center B2C landing page' },
      { src: '/images/prime-edu-center-4.png', alt: 'Prime Education Center curriculum approach' },
      {
        src: '/images/prime-edu-center-5.png',
        alt: 'Prime Education Center home learning catalogue',
      },
      {
        src: '/images/prime-edu-center-6.png',
        alt: 'Prime Education Center Payload CMS media library',
      },
      {
        src: '/images/prime-edu-center-7.png',
        alt: 'Prime Education Center Payload CMS landing page editor',
      },
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
    title: 'GEP Media',
    description: {
      en: 'An education platform for GEP Media and Alumni Tutorial (ALTO), with private and public UTBK tryouts, assessments, a student ebook reader, role-based dashboards, and QR attendance.',
      id: 'Platform pendidikan GEP Media dan Alumni Tutorial (ALTO), dengan tryout UTBK privat dan publik, asesmen, reader ebook siswa, dashboard berbasis peran, serta absensi QR.',
    },
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS', 'NextAuth.js', 'Prisma', 'PostgreSQL'],
    images: [
      {
        src: '/images/gepmedia-1.png',
        alt: 'GEP Media UTBK preparation landing page',
        priority: true,
      },
      {
        src: '/images/gepmedia-2.png',
        alt: 'GEP Media administration dashboard and attendance metrics',
      },
      {
        src: '/images/gepmedia-ebooks.png',
        alt: 'GEP Media populated ebook list with learning materials and readership statistics',
      },
      {
        src: '/images/gepmedia-tryouts-private.png',
        alt: 'GEP Media student portal with available private UTBK tryouts and attempt statuses',
      },
      {
        src: '/images/gepmedia-tryout-private-exam.png',
        alt: 'GEP Media private UTBK exam with questions, saved answers, navigation, and group timer',
      },
      {
        src: '/images/gepmedia-tryout-public.png',
        alt: 'GEP Media public tryout registration with school and participant details',
      },
      {
        src: '/images/gepmedia-tryout-public-exam.png',
        alt: 'GEP Media public UTBK exam with timed question groups and saved answers',
      },
      {
        src: '/images/gepmedia-ebook-reader.png',
        alt: 'GEP Media student PDF reader displaying a lesson with page navigation, zoom, and watermark',
      },
      {
        src: '/images/gepmedia-4.png',
        alt: 'GEP Media QR attendance with employee check-in monitoring',
      },
    ],
    link: {
      href: 'https://www.gepmedia.id/',
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
      {
        src: '/images/ipvision-home.png',
        alt: 'Intermedia Prima Vision live homepage with licensing navigation and event highlights',
        priority: true,
      },
      {
        src: '/images/ipvision-characters.png',
        alt: 'Intermedia Prima Vision licensed character portfolio on the live website',
      },
      {
        src: '/images/ipvision-events.png',
        alt: 'Intermedia Prima Vision latest character experiences, live shows, and events',
      },
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
