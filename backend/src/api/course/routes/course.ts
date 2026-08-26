export default {
  routes: [
    {
      method: 'GET',
      path: '/lms/courses',
      handler: 'api::course.course.findPublished',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/lms/courses/:courseDocumentId',
      handler: 'api::course.course.findPublishedOne',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/lms/manage/courses',
      handler: 'api::course.course.findManaged',
      config: { policies: ['global::is-course-manager'] },
    },
    {
      method: 'GET',
      path: '/lms/manage/courses/:courseDocumentId',
      handler: 'api::course.course.findManagedOne',
      config: { policies: ['global::can-manage-course'] },
    },
    {
      method: 'POST',
      path: '/lms/manage/courses',
      handler: 'api::course.course.createManaged',
      config: { policies: ['global::is-course-manager'] },
    },
    {
      method: 'PUT',
      path: '/lms/manage/courses/:courseDocumentId',
      handler: 'api::course.course.updateManaged',
      config: { policies: ['global::can-manage-course'] },
    },
    {
      method: 'DELETE',
      path: '/lms/manage/courses/:courseDocumentId',
      handler: 'api::course.course.deleteManaged',
      config: { policies: ['global::can-manage-course'] },
    },
  ],
};
