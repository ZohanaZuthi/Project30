export default {
  routes: [
    {
      method: 'GET',
      path: '/lms/blog-posts',
      handler: 'api::blog-post.blog-post.findPublished',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/lms/blog-posts/:slug',
      handler: 'api::blog-post.blog-post.findPublishedOne',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/lms/manage/blog-posts',
      handler: 'api::blog-post.blog-post.findManaged',
      config: { policies: ['global::is-content-editor'] },
    },
    {
      method: 'POST',
      path: '/lms/manage/blog-posts',
      handler: 'api::blog-post.blog-post.createManaged',
      config: { policies: ['global::is-content-editor'] },
    },
    {
      method: 'GET',
      path: '/lms/manage/blog-posts/:blogDocumentId',
      handler: 'api::blog-post.blog-post.findManagedOne',
      config: { policies: ['global::can-manage-blog-post'] },
    },
    {
      method: 'PUT',
      path: '/lms/manage/blog-posts/:blogDocumentId',
      handler: 'api::blog-post.blog-post.updateManaged',
      config: { policies: ['global::can-manage-blog-post'] },
    },
    {
      method: 'DELETE',
      path: '/lms/manage/blog-posts/:blogDocumentId',
      handler: 'api::blog-post.blog-post.deleteManaged',
      config: { policies: ['global::can-manage-blog-post'] },
    },
  ],
};
