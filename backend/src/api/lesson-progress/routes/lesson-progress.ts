export default {
  routes: [
    {
      method: 'PUT',
      path: '/lms/my-courses/:courseDocumentId/lessons/:lessonDocumentId/complete',
      handler: 'api::lesson-progress.lesson-progress.complete',
      config: { policies: ['global::is-enrolled-in-course'] },
    },
    {
      method: 'GET',
      path: '/lms/my-courses/:courseDocumentId/progress',
      handler: 'api::lesson-progress.lesson-progress.mine',
      config: { policies: ['global::is-enrolled-in-course'] },
    },
    {
      method: 'GET',
      path: '/lms/manage/courses/:courseDocumentId/progress',
      handler: 'api::lesson-progress.lesson-progress.forManagedCourse',
      config: { policies: ['global::can-manage-course'] },
    },
  ],
};
