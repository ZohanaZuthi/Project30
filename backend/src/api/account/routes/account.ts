export default {
  routes: [
    {
      method: 'GET',
      path: '/lms/me',
      handler: 'api::account.account.me',
      // The stock Users & Permissions strategy dereferences user.role.id and
      // cannot authenticate a deliberately unassigned user. This controller
      // verifies the JWT itself so it can return the valid role: null state.
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/lms/logout',
      handler: 'api::account.account.logout',
      // A valid refresh token authorizes revocation of that session only. This
      // also works after an Admin deliberately removes the user's role.
      config: { auth: false },
    },
  ],
};
