export const SITE_URL = 'https://dartedmonki.com';
export const GITHUB_URL = 'https://github.com/DartedMonki';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/daniafriyadi/';
export const AVATAR_URL = 'https://avatars.githubusercontent.com/u/12370632?v=4';

export const PERSON_NAME = 'Afriyadi Yanuar Rahmadani';
export const DISPLAY_NAME = 'Afriyadi Y. R.';
export const PERSON_ALIASES = ['Afriyadi', 'Dani Afriyadi', 'DartedMonki', DISPLAY_NAME] as const;
export const PERSON_ROLE = 'Software Engineer';
export const PERSON_EXPERTISE = [
  'Software Engineering',
  'Frontend Development',
  'React.js',
  'Next.js',
  'Vue.js',
  'React Native',
  'Flutter',
  'Go',
  'Spring Java',
  'Laravel',
  'PostgreSQL',
  'Performance Optimization',
] as const;

export const SEO_TITLE = `${DISPLAY_NAME} - ${PERSON_ROLE}`;
export const SEO_DESCRIPTIONS = {
  en: 'Software engineer with experience in React.js, Next.js, Vue.js, Spring, Go, Laravel, Flutter, React Native, and more. View my projects and get in touch.',
  id: 'Software engineer dengan pengalaman di React.js, Next.js, Vue.js, Spring, Go, Laravel, Flutter, React Native, dan lainnya. Lihat proyek saya dan hubungi saya.',
} as const;

export const SEO_DEFAULTS = {
  title: SEO_TITLE,
  description: SEO_DESCRIPTIONS.en,
  author: PERSON_NAME,
  themeColor: '#556cd6',
  openGraphType: 'website',
  siteName: `${PERSON_NAME} Portfolio`,
  twitterCard: 'summary_large_image',
} as const;

export const SEO_PAGES = {
  en: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTIONS.en,
  },
  id: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTIONS.id,
  },
} as const;
