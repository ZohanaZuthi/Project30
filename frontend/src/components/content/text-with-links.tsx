import { Fragment } from "react";

const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
const trailingPunctuation = /[.,;:!?)}\]]+$/;

export function TextWithLinks({ text }: { text: string }) {
  return text.split(urlPattern).map((part, index) => {
    if (!part.match(/^https?:\/\//)) {
      return <Fragment key={index}>{part}</Fragment>;
    }

    const trailing = part.match(trailingPunctuation)?.[0] ?? "";
    const href = trailing ? part.slice(0, -trailing.length) : part;

    return (
      <Fragment key={index}>
        <a href={href} rel="noreferrer" target="_blank">
          {href}
        </a>
        {trailing}
      </Fragment>
    );
  });
}
