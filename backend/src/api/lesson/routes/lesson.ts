export default {
  routes: [
    {
      method: 'GET',
      path: '/lms/manage/courses/:courseDocumentId/lessons',
      handler: 'api::lesson.lesson.findForManagedCourse',
      config: { policies: ['global::can-manage-course'] },
    },
    {
      method: 'POST',
      path: '/lms/manage/courses/:courseDocumentId/lessons',
      handler: 'api::lesson.lesson.createForManagedCourse',
      config: { policies: ['global::can-manage-course'] },
    },
    {
      method: 'PUT',
      path: '/lms/manage/lessons/:lessonDocumentId',
      handler: 'api::lesson.lesson.updateManaged',
      config: { policies: ['global::can-manage-lesson'] },
    },
    {
      method: 'DELETE',
      path: '/lms/manage/lessons/:lessonDocumentId',
      handler: 'api::lesson.lesson.deleteManaged',
      config: { policies: ['global::can-manage-lesson'] },
    },
    {
      method: 'GET',
      path: '/lms/my-courses/:courseDocumentId/lessons/:lessonDocumentId',
      handler: 'api::lesson.lesson.findForStudent',
      config: { policies: ['global::is-enrolled-in-course'] },
    },
  ],
};
