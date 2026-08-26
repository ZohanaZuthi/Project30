const path = require('node:path');

const { createStrapi } = require('@strapi/strapi');

const courses = [
  {
    slug: 'nextjs-full-stack-bangla',
    title: 'Next.js Full-Stack Development',
    description:
      'বাংলায় modern React, App Router, API integration ও production-ready full-stack project তৈরি শিখুন।',
    thumbnailUrl:
      'https://images.pexels.com/photos/5926382/pexels-photo-5926382.jpeg?auto=compress&cs=tinysrgb&w=1400',
    lessons: [
      {
        title: 'কোর্স পরিচিতি ও শেখার রোডম্যাপ',
        content: 'Understand the project, tools, and the full-stack learning path.',
        videoUrl: 'https://www.youtube.com/watch?v=NgrljB7UU34',
      },
      {
        title: 'App Router ও Server Components',
        content: 'Build routes, layouts, and data-driven Server Components.',
      },
      {
        title: 'Strapi API Integration',
        content: 'Connect a Next.js frontend to protected Strapi REST endpoints.',
      },
      {
        title: 'Authentication ও Role Protection',
        content: 'Protect pages and backend actions with secure session handling.',
      },
      {
        title: 'Production Build ও Deployment',
        content: 'Prepare the application for Vercel and Railway.',
      },
    ],
    quiz: {
      title: 'Next.js foundations check',
      questions: [
        {
          prompt: 'Which component type is the default in the App Router?',
          options: ['Client Component', 'Server Component', 'Class Component'],
          correctOption: 1,
        },
        {
          prompt: 'Where must role authorization finally be enforced?',
          options: ['Only in CSS', 'Only in Next.js', 'In the backend API'],
          correctOption: 2,
        },
      ],
    },
  },
  {
    slug: 'ui-ux-figma-bangla',
    title: 'UI/UX Design with Figma',
    description:
      'Research থেকে wireframe, visual system ও clickable prototype—একটি বাস্তব product case study দিয়ে শিখুন।',
    thumbnailUrl:
      'https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg?auto=compress&cs=tinysrgb&w=1400',
    lessons: [
      {
        title: 'Figma workspace পরিচিতি',
        content: 'Learn frames, auto layout, components, and reusable styles.',
        videoUrl: 'https://www.youtube.com/watch?v=Ed1ineovwzg',
      },
      {
        title: 'User research ও problem framing',
        content: 'Turn user needs into a focused product problem.',
      },
      {
        title: 'Wireframe থেকে high-fidelity UI',
        content: 'Design responsive screens with a consistent visual system.',
      },
      {
        title: 'Prototype ও usability testing',
        content: 'Connect flows, test assumptions, and improve the experience.',
      },
    ],
    quiz: {
      title: 'Product design essentials',
      questions: [
        {
          prompt: 'What should happen before high-fidelity visual design?',
          options: ['User research', 'Random animation', 'Deployment'],
          correctOption: 0,
        },
      ],
    },
  },
  {
    slug: 'digital-marketing-growth-bangla',
    title: 'Digital Marketing & Growth',
    description:
      'Content, SEO, paid campaign ও analytics ব্যবহার করে measurable growth campaign পরিকল্পনা করুন।',
    thumbnailUrl:
      'https://images.pexels.com/photos/4443182/pexels-photo-4443182.jpeg?auto=compress&cs=tinysrgb&w=1400',
    lessons: [
      {
        title: 'Digital marketing fundamentals',
        content: 'Understand channels, funnels, audiences, and campaign goals.',
        videoUrl: 'https://www.youtube.com/watch?v=uNNcfiqNajg',
      },
      {
        title: 'Content strategy ও customer journey',
        content: 'Map useful content to each stage of a customer journey.',
      },
      {
        title: 'SEO ও campaign measurement',
        content: 'Choose practical metrics and evaluate campaign performance.',
      },
      {
        title: 'Capstone growth campaign',
        content: 'Create a complete campaign brief for a local business.',
      },
    ],
    quiz: {
      title: 'Growth marketing check',
      questions: [
        {
          prompt: 'Which metric best reflects a campaign business outcome?',
          options: ['Font size', 'Conversion rate', 'Number of design files'],
          correctOption: 1,
        },
      ],
    },
  },
  {
    slug: 'python-data-analysis-bangla',
    title: 'Python for Data Analysis',
    description:
      'Python basics থেকে data cleaning, analysis ও visualization—portfolio-ready notebook projectসহ।',
    thumbnailUrl:
      'https://images.pexels.com/photos/1181359/pexels-photo-1181359.jpeg?auto=compress&cs=tinysrgb&w=1400',
    lessons: [
      {
        title: 'Python setup ও core syntax',
        content: 'Set up Python and learn variables, conditions, loops, and functions.',
        videoUrl: 'https://www.youtube.com/watch?v=1mLmW0sTzjw',
      },
      {
        title: 'Working with structured data',
        content: 'Load, inspect, and clean tabular datasets.',
      },
      {
        title: 'Analysis ও visualization',
        content: 'Answer questions using summaries, grouping, and charts.',
      },
      {
        title: 'Portfolio data project',
        content: 'Present an end-to-end analysis with findings and recommendations.',
      },
    ],
    quiz: {
      title: 'Python data basics',
      questions: [
        {
          prompt: 'What should you do before analyzing an unfamiliar dataset?',
          options: ['Inspect and clean it', 'Delete it', 'Publish it immediately'],
          correctOption: 0,
        },
      ],
    },
  },
];

async function seedCourse(strapi, seed) {
  let course = await strapi.documents('api::course.course').findFirst({
    status: 'draft',
    filters: { slug: seed.slug },
  });

  if (!course) {
    course = await strapi.documents('api::course.course').create({
      data: {
        title: seed.title,
        slug: seed.slug,
        description: seed.description,
        thumbnailUrl: seed.thumbnailUrl,
      },
    });
  }

  const existingLessons = await strapi.db.query('api::lesson.lesson').findMany({
    where: { course: { documentId: course.documentId } },
    select: ['title'],
  });
  const lessonTitles = new Set(existingLessons.map(({ title }) => title));

  for (const [index, lesson] of seed.lessons.entries()) {
    if (lessonTitles.has(lesson.title)) continue;
    await strapi.documents('api::lesson.lesson').create({
      data: {
        ...lesson,
        position: index + 1,
        course: course.documentId,
      },
    });
  }

  const existingQuiz = await strapi.db.query('api::quiz.quiz').findOne({
    where: {
      title: seed.quiz.title,
      course: { documentId: course.documentId },
    },
    select: ['id'],
  });
  if (!existingQuiz) {
    await strapi.documents('api::quiz.quiz').create({
      data: { ...seed.quiz, course: course.documentId },
    });
  }

  await strapi.documents('api::course.course').publish({
    documentId: course.documentId,
  });
  return seed.title;
}

async function main() {
  const appDir = path.resolve(__dirname, '..');
  const strapi = await createStrapi({
    appDir,
    distDir: path.join(appDir, 'dist'),
  }).load();

  try {
    for (const seed of courses) {
      const title = await seedCourse(strapi, seed);
      strapi.log.info(`Demo course ready: ${title}`);
    }
  } finally {
    await strapi.db.connection.destroy();
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
