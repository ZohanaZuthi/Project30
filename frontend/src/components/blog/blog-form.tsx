"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { lmsMutation } from "@/lib/client-api";
import type { BlogPost } from "@/lib/types";

export function BlogForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const editing = Boolean(post);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await lmsMutation<BlogPost>(
        editing
          ? `/api/lms/manage/blog-posts/${post!.documentId}`
          : "/api/lms/manage/blog-posts",
        editing ? "PUT" : "POST",
        {
          title: form.get("title"),
          body: form.get("body"),
          coverImageUrl: form.get("coverImageUrl"),
          publish: form.get("publish") === "on",
        },
      );
      router.push(`/manage/blogs/${result.data.documentId}/edit`);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The post could not be saved.",
      );
      setPending(false);
    }
  }

  async function remove() {
    if (
      !post ||
      !window.confirm(`Delete “${post.title}”? This cannot be undone.`)
    )
      return;
    setDeleting(true);
    setError("");
    try {
      await lmsMutation(
        `/api/lms/manage/blog-posts/${post.documentId}`,
        "DELETE",
      );
      router.push("/manage/blogs");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The post could not be deleted.",
      );
      setDeleting(false);
    }
  }

  return (
    <form className="editor-form blog-editor-form" onSubmit={submit}>
      <label>
        Post title
        <input
          defaultValue={post?.title}
          maxLength={180}
          minLength={3}
          name="title"
          required
        />
      </label>
      <label>
        Cover image URL{" "}
        <span className="optional">
          optional · approved Pexels images are optimized
        </span>
        <input
          defaultValue={post?.coverImageUrl ?? ""}
          name="coverImageUrl"
          type="url"
        />
      </label>
      <label>
        Article body
        <textarea
          defaultValue={post?.body}
          maxLength={100000}
          minLength={1}
          name="body"
          required
          rows={18}
        />
      </label>
      <label className="check-row">
        <input
          defaultChecked={Boolean(post?.publishedAt)}
          name="publish"
          type="checkbox"
        />
        <span>
          Publish this post publicly
          <small>Leave unchecked to save a private draft and publish later.</small>
        </span>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions split-actions">
        {post ? (
          <button
            className="button danger"
            disabled={pending || deleting}
            onClick={remove}
            type="button"
          >
            {deleting ? "Deleting…" : "Delete post"}
          </button>
        ) : (
          <span />
        )}
        <button
          className="button primary"
          disabled={pending || deleting}
          type="submit"
        >
          {pending ? "Saving…" : post ? "Save post" : "Create post"}
        </button>
      </div>
    </form>
  );
}
