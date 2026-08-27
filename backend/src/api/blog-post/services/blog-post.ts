import { randomUUID } from "node:crypto";

import { factories } from "@strapi/strapi";
import type { Core } from "@strapi/strapi";
import type { Modules } from "@strapi/types";
import { errors } from "@strapi/utils";
import type { z } from "zod";

import {
  APP_ROLES,
  getRoleType,
  type ApplicationUser,
} from "../../../utils/authorization";
import type {
  blogCreateSchema,
  blogUpdateSchema,
} from "../../../utils/validation";

type BlogCreateInput = z.infer<typeof blogCreateSchema>;
type BlogUpdateInput = z.infer<typeof blogUpdateSchema>;
type BlogDocument = {
  documentId: string;
  title: string;
  slug: string;
  body: string;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  author?: { documentId?: string; username?: string } | null;
};

type PublicationDocument = {
  documentId: string;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

const { NotFoundError, ValidationError } = errors;
const fields = [
  "title",
  "slug",
  "body",
  "coverImageUrl",
  "publishedAt",
] satisfies Modules.Documents.Params.Fields.ArrayNotation<"api::blog-post.blog-post">;
const populate = {
  author: { fields: ["documentId", "username"] },
} satisfies Modules.Documents.Params.Populate.ObjectNotation<"api::blog-post.blog-post">;

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return `${base || "post"}-${randomUUID().slice(0, 8)}`;
}

function blogDto(post: BlogDocument) {
  return {
    documentId: post.documentId,
    title: post.title,
    slug: post.slug,
    body: post.body,
    coverImageUrl: post.coverImageUrl ?? null,
    publishedAt: post.publishedAt ?? null,
    author: post.author
      ? {
          documentId: post.author.documentId,
          username: post.author.username ?? "Author",
        }
      : null,
  };
}

function publicationDate(value: unknown) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

async function managedBlogDto(strapi: Core.Strapi, post: BlogDocument) {
  const published = await strapi.documents("api::blog-post.blog-post").findOne({
    documentId: post.documentId,
    status: "published",
    fields: ["publishedAt", "updatedAt"],
  });
  return blogDto({
    ...post,
    publishedAt: published
      ? (publicationDate(
          (published as PublicationDocument).publishedAt ??
            (published as PublicationDocument).updatedAt,
        ) ?? new Date().toISOString())
      : null,
  });
}

export default factories.createCoreService(
  "api::blog-post.blog-post",
  ({ strapi }) => ({
    async findPublished() {
      const posts = await strapi
        .documents("api::blog-post.blog-post")
        .findMany({
          status: "published",
          fields,
          populate,
          sort: ["publishedAt:desc"],
        });
      return (posts as unknown as BlogDocument[]).map(blogDto);
    },

    async findPublishedOne(slug: string) {
      const post = await strapi
        .documents("api::blog-post.blog-post")
        .findFirst({
          status: "published",
          filters: { slug },
          fields,
          populate,
        });
      if (!post) throw new NotFoundError("Published blog post not found.");
      return blogDto(post as unknown as BlogDocument);
    },

    async findManaged(user: ApplicationUser) {
      const posts = await strapi
        .documents("api::blog-post.blog-post")
        .findMany({
          status: "draft",
          filters:
            getRoleType(user) === APP_ROLES.CONTENT_MANAGER
              ? { author: { id: user.id } }
              : undefined,
          fields,
          populate,
          sort: ["updatedAt:desc"],
        });
      return Promise.all(
        (posts as unknown as BlogDocument[]).map((post) =>
          managedBlogDto(strapi, post),
        ),
      );
    },

    async findManagedOne(documentId: string) {
      const post = await strapi.documents("api::blog-post.blog-post").findOne({
        documentId,
        status: "draft",
        fields,
        populate,
      });
      if (!post) throw new NotFoundError("Blog post not found.");
      return managedBlogDto(strapi, post as unknown as BlogDocument);
    },

    async createManaged(user: ApplicationUser, input: BlogCreateInput) {
      if (!user.documentId)
        throw new ValidationError("The author account is invalid.");
      const { publish, ...postFields } = input;
      const post = await strapi.documents("api::blog-post.blog-post").create({
        data: {
          ...postFields,
          slug: slugify(postFields.title),
          author: user.documentId,
        } as never,
      });
      if (publish) {
        await strapi.documents("api::blog-post.blog-post").publish({
          documentId: post.documentId,
        });
      }
      return this.findManagedOne(post.documentId);
    },

    async updateManaged(documentId: string, input: BlogUpdateInput) {
      const { publish, ...postFields } = input;
      await strapi.documents("api::blog-post.blog-post").update({
        documentId,
        data: postFields as never,
      });
      if (publish === true) {
        await strapi
          .documents("api::blog-post.blog-post")
          .publish({ documentId });
      } else if (publish === false) {
        await strapi
          .documents("api::blog-post.blog-post")
          .unpublish({ documentId });
      }
      return this.findManagedOne(documentId);
    },

    async deleteManaged(documentId: string) {
      await strapi.documents("api::blog-post.blog-post").delete({ documentId });
      return { documentId };
    },
  }),
);
