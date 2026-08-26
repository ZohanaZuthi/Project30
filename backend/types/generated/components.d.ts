import type { Schema, Struct } from '@strapi/strapi';

export interface QuizQuestion extends Struct.ComponentSchema {
  collectionName: 'components_quiz_questions';
  info: {
    description: 'An MCQ question with a server-only correct option';
    displayName: 'Question';
  };
  attributes: {
    correctOption: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    options: Schema.Attribute.JSON & Schema.Attribute.Required;
    prompt: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'quiz.question': QuizQuestion;
    }
  }
}
