export type Locale = 'en' | 'id';

export interface LocaleCopy {
  about: {
    title: string;
    content: string;
    avatar: string;
    closeLabel: string;
  };
  hint: {
    title: string;
    content: string;
    triggerLabel: string;
    closeLabel: string;
  };
  alert: {
    messageSending: string;
    messageSent: string;
    messageReceived: string;
    messageRateLimited: string;
    messageTemporarilyUnavailable: string;
    messageFailed: string;
  };
  home: {
    you: string;
  };
  terrain: {
    loading: string;
    loadingBackground: string;
    backgroundLabel: string;
    badge: string;
    pageDescription: string;
    openSettingsLabel: string;
    closeSettingsBackdropLabel: string;
    title: string;
    resetLabel: string;
    reset: string;
    qualityPreset: string;
    qualityOptions: {
      ultra: string;
      high: string;
      medium: string;
      low: string;
    };
    qualityOptionLabels: {
      ultra: string;
      high: string;
      medium: string;
      low: string;
    };
    restartMessage: string;
    applyRestartLabel: string;
    applyRestart: string;
    rendering: string;
    antialiasing: string;
    terrainDetail: string;
    renderDistance: string;
    pixelRatio: string;
    low: string;
    normal: string;
    high: string;
    wireframe: string;
    enableWireframe: string;
    wireframeOpacity: string;
    terrainShape: string;
    heightScale: string;
    noiseScale: string;
    stars: string;
    showStars: string;
    starSize: string;
    starOpacity: string;
    starsPerChunk: string;
    appearance: string;
    terrainColor: string;
    camera: string;
    cameraNotSaved: string;
    cameraHeight: string;
    cameraDistance: string;
  };
  footer: {
    brandSubtitle: string[];
    description: string;
    messageLabel: string;
    messagePlaceholder: string;
    messageSubmit: string;
    socialLabel: string;
    builtWith: string;
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
      closeLabel: 'Close about dialog',
    },
    hint: {
      title: 'Typing shortcut',
      content:
        'You can type directly anywhere on this site. Press Enter when you are done and your message, including your IP address, will be sent to me.',
      triggerLabel: 'Show typing shortcut hint',
      closeLabel: 'Close typing shortcut hint',
    },
    alert: {
      messageSending: 'Sending your message...',
      messageSent: 'Your message was sent.',
      messageReceived: 'Your message was received.',
      messageRateLimited: 'Please wait a bit before sending another message.',
      messageTemporarilyUnavailable:
        'Message service is temporarily unavailable. Please try again soon.',
      messageFailed: 'Could not send your message. Please try again.',
    },
    home: {
      you: 'You: ',
    },
    terrain: {
      loading: 'Loading terrain',
      loadingBackground: 'Loading terrain background',
      backgroundLabel: 'Interactive 3D terrain background',
      badge: 'Built with Three.js',
      pageDescription:
        'This page features an interactive 3D wireframe terrain background created with Three.js. The content below is the main portfolio information.',
      openSettingsLabel: 'Open terrain settings',
      closeSettingsBackdropLabel: 'Close terrain settings backdrop',
      title: 'Terrain Settings',
      resetLabel: 'Reset to default settings',
      reset: 'Reset',
      qualityPreset: 'Quality Preset',
      qualityOptions: {
        ultra: 'Ultra',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      },
      qualityOptionLabels: {
        ultra: 'Ultra quality',
        high: 'High quality',
        medium: 'Medium quality',
        low: 'Low quality',
      },
      restartMessage: 'Some changes require restarting the terrain renderer.',
      applyRestartLabel: 'Apply changes and restart renderer',
      applyRestart: 'Apply & Restart Renderer',
      rendering: 'Rendering',
      antialiasing: 'Anti-aliasing',
      terrainDetail: 'Terrain Detail',
      renderDistance: 'Render Distance',
      pixelRatio: 'Pixel Ratio',
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      wireframe: 'Wireframe',
      enableWireframe: 'Enable Wireframe',
      wireframeOpacity: 'Wireframe Opacity',
      terrainShape: 'Terrain Shape',
      heightScale: 'Height Scale',
      noiseScale: 'Noise Scale',
      stars: 'Stars',
      showStars: 'Show Stars',
      starSize: 'Star Size',
      starOpacity: 'Star Opacity',
      starsPerChunk: 'Stars Per Chunk',
      appearance: 'Appearance',
      terrainColor: 'Terrain Color',
      camera: 'Camera',
      cameraNotSaved: 'Camera settings will not be saved between sessions',
      cameraHeight: 'Camera Height',
      cameraDistance: 'Camera Distance',
    },
    footer: {
      brandSubtitle: ['SOFTWARE', 'ENGINEER'],
      description:
        'Building web and mobile experiences across React, Next.js, Vue, Flutter, and React Native.',
      messageLabel: 'SEND MESSAGE TO ME',
      messagePlaceholder: 'ENTER MESSAGE',
      messageSubmit: 'Send message',
      socialLabel: 'SOCIAL',
      builtWith: 'BUILT WITH ASTRO + THREE.JS',
    },
  },
  id: {
    about: {
      title: 'Tentang saya',
      content: `Saya adalah software engineer dengan pengalaman {years} tahun. Saat ini saya bekerja di Monee bersama tim ShopeePay, mengembangkan dan merawat fitur frontend untuk portal admin ShopeePay serta plugin ShopeePay di aplikasi React Native utama. Fokus saya adalah menjaga kualitas kode, memastikan rilis berjalan stabil, dan mengoptimalkan performa untuk mendukung operasional di berbagai negara.

Sebelum bergabung dengan Monee, saya bekerja di Segari, perusahaan teknologi Seri B di bidang rantai pasok kebutuhan harian online. Di sana saya membangun dan meningkatkan sistem manajemen gudang, terutama untuk pelacakan inventaris dan logistik. Sebelumnya, saya bekerja di ZebraX Technology, menangani peningkatan kualitas kode, pembaruan UI berskala besar, dan integrasi berbagai API seperti Google Maps, Firebase, serta Midtrans untuk pembayaran.

Stack yang sering saya gunakan meliputi React.js, Next.js, dan Vue.js untuk frontend; Spring (Java), Go, dan Laravel untuk backend. Saya juga membangun aplikasi mobile dengan Flutter dan React Native, sehingga terbiasa bekerja di ekosistem web maupun mobile. Untuk database, saya menggunakan PostgreSQL, dan saya juga berpengalaman dengan Redis untuk caching serta Jenkins untuk deployment. Saya senang memecahkan tantangan teknis dan selalu antusias mempelajari teknologi baru.`,
      avatar: 'Siapakah saya?',
      closeLabel: 'Tutup dialog tentang saya',
    },
    hint: {
      title: 'Shortcut mengetik',
      content:
        'Anda bisa langsung mengetik di mana saja pada situs ini. Tekan Enter setelah selesai, lalu pesan Anda beserta IP address akan dikirimkan kepada saya.',
      triggerLabel: 'Tampilkan petunjuk shortcut mengetik',
      closeLabel: 'Tutup petunjuk shortcut mengetik',
    },
    alert: {
      messageSending: 'Mengirim pesan Anda...',
      messageSent: 'Pesan Anda telah dikirim.',
      messageReceived: 'Pesan Anda telah diterima.',
      messageRateLimited: 'Mohon tunggu sebentar sebelum mengirim pesan lagi.',
      messageTemporarilyUnavailable:
        'Layanan pesan sedang tidak tersedia sementara. Silakan coba lagi nanti.',
      messageFailed: 'Pesan Anda belum bisa dikirim. Silakan coba lagi.',
    },
    home: {
      you: 'Anda: ',
    },
    terrain: {
      loading: 'Memuat terrain',
      loadingBackground: 'Memuat latar belakang terrain',
      backgroundLabel: 'Latar belakang terrain 3D interaktif',
      badge: 'Dibuat dengan Three.js',
      pageDescription:
        'Halaman ini memiliki latar belakang terrain wireframe 3D interaktif yang dibuat dengan Three.js. Konten di bawahnya adalah informasi utama portofolio.',
      openSettingsLabel: 'Buka pengaturan terrain',
      closeSettingsBackdropLabel: 'Tutup panel pengaturan terrain',
      title: 'Pengaturan Terrain',
      resetLabel: 'Kembalikan ke pengaturan bawaan',
      reset: 'Reset',
      qualityPreset: 'Preset Kualitas',
      qualityOptions: {
        ultra: 'Ultra',
        high: 'Tinggi',
        medium: 'Sedang',
        low: 'Rendah',
      },
      qualityOptionLabels: {
        ultra: 'Kualitas ultra',
        high: 'Kualitas tinggi',
        medium: 'Kualitas sedang',
        low: 'Kualitas rendah',
      },
      restartMessage: 'Beberapa perubahan baru berlaku setelah renderer terrain dimulai ulang.',
      applyRestartLabel: 'Terapkan perubahan dan mulai ulang renderer',
      applyRestart: 'Terapkan & Mulai Ulang Renderer',
      rendering: 'Rendering',
      antialiasing: 'Anti-aliasing',
      terrainDetail: 'Detail Terrain',
      renderDistance: 'Jarak Render',
      pixelRatio: 'Rasio Piksel',
      low: 'Rendah',
      normal: 'Normal',
      high: 'Tinggi',
      wireframe: 'Wireframe',
      enableWireframe: 'Aktifkan Wireframe',
      wireframeOpacity: 'Opasitas Wireframe',
      terrainShape: 'Bentuk Terrain',
      heightScale: 'Skala Ketinggian',
      noiseScale: 'Skala Pola Noise',
      stars: 'Bintang',
      showStars: 'Tampilkan Bintang',
      starSize: 'Ukuran Bintang',
      starOpacity: 'Opasitas Bintang',
      starsPerChunk: 'Jumlah Bintang per Chunk',
      appearance: 'Tampilan',
      terrainColor: 'Warna Terrain',
      camera: 'Kamera',
      cameraNotSaved: 'Pengaturan kamera tidak disimpan antar sesi',
      cameraHeight: 'Tinggi Kamera',
      cameraDistance: 'Jarak Kamera',
    },
    footer: {
      brandSubtitle: ['SOFTWARE', 'ENGINEER'],
      description:
        'Membangun pengalaman web dan mobile dengan React, Next.js, Vue, Flutter, dan React Native.',
      messageLabel: 'KIRIM PESAN KE SAYA',
      messagePlaceholder: 'TULIS PESAN',
      messageSubmit: 'Kirim pesan',
      socialLabel: 'SOSIAL',
      builtWith: 'DIBUAT DENGAN ASTRO + THREE.JS',
    },
  },
} satisfies Record<Locale, LocaleCopy>;
