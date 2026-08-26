export default {
  routes: [
    {
      method: 'GET',
      path: '/lms/my-quiz-attempts',
      handler: 'api::quiz-attempt.quiz-attempt.mine',
      config: { policies: ['global::is-student'] },
    },
  ],
};
