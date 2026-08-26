export default {
  routes: [
    {
      method: 'GET',
      path: '/lms/me',
      handler: 'api::account.account.me',
    },
  ],
};
