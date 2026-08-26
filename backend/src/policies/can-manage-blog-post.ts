import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

import { canManageBlogPost, type ApplicationUser } from '../utils/authorization';

export default async (
  policyContext: Context,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
) => {
  const documentId = policyContext.params.blogDocumentId;
  if (typeof documentId !== 'string') return false;

  const post = await strapi.db.query('api::blog-post.blog-post').findOne({
    where: { documentId },
    populate: { author: true },
  });
  if (!post) return false;

  policyContext.state.managedBlogPost = post;
  return canManageBlogPost(
    policyContext.state.user as ApplicationUser | undefined,
    post.author
  );
};
