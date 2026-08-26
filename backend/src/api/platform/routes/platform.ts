export default {
  routes: [
    {
      method: 'GET',
      path: '/lms/admin/users',
      handler: 'api::platform.platform.findUsers',
      config: { policies: ['global::is-admin'] },
    },
    {
      method: 'PATCH',
      path: '/lms/admin/users/:userDocumentId/role',
      handler: 'api::platform.platform.updateRole',
      config: { policies: ['global::is-admin'] },
    },
    {
      method: 'PATCH',
      path: '/lms/admin/users/:userDocumentId/status',
      handler: 'api::platform.platform.updateStatus',
      config: { policies: ['global::is-admin'] },
    },
    {
      method: 'DELETE',
      path: '/lms/admin/users/:userDocumentId',
      handler: 'api::platform.platform.deleteUser',
      config: { policies: ['global::is-admin'] },
    },
    {
      method: 'GET',
      path: '/lms/admin/stats',
      handler: 'api::platform.platform.stats',
      config: { policies: ['global::is-admin'] },
    },
  ],
};
