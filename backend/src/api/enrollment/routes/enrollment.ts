export default {
  routes: [
    {
      method: 'POST',
      path: '/lms/courses/:courseDocumentId/enroll',
      handler: 'api::enrollment.enrollment.enroll',
      config: { policies: ['global::is-student'] },
    },
    {
      method: 'GET',
      path: '/lms/my-courses',
      handler: 'api::enrollment.enrollment.findMine',
      config: { policies: ['global::is-student'] },
    },
    {
      method: 'GET',
      path: '/lms/my-courses/:courseDocumentId',
      handler: 'api::enrollment.enrollment.findMineOne',
      config: { policies: ['global::is-enrolled-in-course'] },
    },
  ],
};
