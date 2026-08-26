export type GradableQuestion = {
  options: unknown[];
  correctOption: number;
};

export function gradeQuiz(questions: GradableQuestion[], answers: number[]) {
  const normalizedAnswers = questions.map((question, index) => {
    const answer = answers[index];
    return Number.isInteger(answer) && answer >= 0 && answer < question.options.length
      ? answer
      : null;
  });
  const score = questions.reduce(
    (total, question, index) =>
      total + (normalizedAnswers[index] === question.correctOption ? 1 : 0),
    0
  );

  return {
    answers: normalizedAnswers,
    score,
    total: questions.length,
    percentage:
      questions.length === 0 ? 0 : Math.round((score / questions.length) * 100),
  };
}
