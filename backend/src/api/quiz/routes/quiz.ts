export default {
  routes: [
    {
      method: 'GET',
      path: '/lms/manage/courses/:courseDocumentId/quizzes',
      handler: 'api::quiz.quiz.findForManagedCourse',
      config: { policies: ['global::can-manage-course'] },
    },
    {
      method: 'POST',
      path: '/lms/manage/courses/:courseDocumentId/quizzes',
      handler: 'api::quiz.quiz.createForManagedCourse',
      config: { policies: ['global::can-manage-course'] },
    },
    {
      method: 'PUT',
      path: '/lms/manage/quizzes/:quizDocumentId',
      handler: 'api::quiz.quiz.updateManaged',
      config: { policies: ['global::can-manage-quiz'] },
    },
    {
      method: 'DELETE',
      path: '/lms/manage/quizzes/:quizDocumentId',
      handler: 'api::quiz.quiz.deleteManaged',
      config: { policies: ['global::can-manage-quiz'] },
    },
    {
      method: 'GET',
      path: '/lms/my-courses/:courseDocumentId/quizzes',
      handler: 'api::quiz.quiz.findForStudent',
      config: { policies: ['global::is-enrolled-in-course'] },
    },
    {
      method: 'GET',
      path: '/lms/my-courses/:courseDocumentId/quizzes/:quizDocumentId',
      handler: 'api::quiz.quiz.findOneForStudent',
      config: { policies: ['global::is-enrolled-in-course'] },
    },
    {
      method: 'POST',
      path: '/lms/my-courses/:courseDocumentId/quizzes/:quizDocumentId/attempts',
      handler: 'api::quiz.quiz.submit',
      config: { policies: ['global::is-enrolled-in-course'] },
    },
  ],
};
