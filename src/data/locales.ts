export type Locale = 'en' | 'id';

export interface LocaleCopy {
  about: {
    title: string;
    content: string;
    avatar: string;
  };
  alert: {
    mouseMessage: string;
  };
  home: {
    you: string;
  };
}

export const locales = {
  en: {
    about: {
      title: 'About me',
      content: `I'm a software engineer with {years} years of experience, currently working at Monee on the ShopeePay team. I develop and maintain frontend features for ShopeePay admin portal and manage the ShopeePay plugin within the main React Native application. I focus on code quality improvements, stable deployments, and performance optimization to support multinational market operations.

Before Monee, I worked at Segari, a Series B-funded tech company in the online grocery supply chain space, where I built and improved warehouse management systems, focusing on inventory tracking and logistics. Prior to that, I worked at ZebraX Technology where I improved code quality, did major UI updates, and worked with various APIs like Google Maps, Firebase, and Midtrans for payments.

My tech stack includes React.js, Next.js, Vue.js for frontend development, and Spring (Java), Go, Laravel for backend work. I also build mobile apps using Flutter and React Native, bringing my experience in both web and mobile development. I work with PostgreSQL for databases and have experience with tools like Redis for caching and Jenkins for deployment.  I enjoy solving technical challenges and am always excited to learn new technologies.`,
      avatar: 'Who am I?',
    },
    alert: {
      mouseMessage: 'Your message with IP address: {ipAddress} has been recorded.',
    },
    home: {
      you: 'You: ',
    },
  },
  id: {
    about: {
      title: 'Tentang saya',
      content: `Saya adalah software engineer dengan pengalaman {years} tahun. Saat ini saya bekerja di Monee bersama tim ShopeePay, mengembangkan dan merawat fitur frontend untuk portal admin ShopeePay serta plugin ShopeePay di aplikasi React Native utama. Fokus saya adalah menjaga kualitas kode, memastikan rilis berjalan stabil, dan mengoptimalkan performa untuk mendukung operasional di berbagai negara.

Sebelum bergabung dengan Monee, saya bekerja di Segari, perusahaan teknologi Seri B di bidang rantai pasok kebutuhan harian online. Di sana saya membangun dan meningkatkan sistem manajemen gudang, terutama untuk pelacakan inventaris dan logistik. Sebelumnya, saya bekerja di ZebraX Technology, menangani peningkatan kualitas kode, pembaruan UI berskala besar, dan integrasi berbagai API seperti Google Maps, Firebase, serta Midtrans untuk pembayaran.

Stack yang sering saya gunakan meliputi React.js, Next.js, dan Vue.js untuk frontend; Spring (Java), Go, dan Laravel untuk backend. Saya juga membangun aplikasi mobile dengan Flutter dan React Native, sehingga terbiasa bekerja di ekosistem web maupun mobile. Untuk database, saya menggunakan PostgreSQL, dan saya juga berpengalaman dengan Redis untuk caching serta Jenkins untuk deployment. Saya senang memecahkan tantangan teknis dan selalu antusias mempelajari teknologi baru.`,
      avatar: 'Siapakah saya?',
    },
    alert: {
      mouseMessage: 'Pesan Anda dengan IP address: {ipAddress} telah disimpan.',
    },
    home: {
      you: 'Anda: ',
    },
  },
} satisfies Record<Locale, LocaleCopy>;
