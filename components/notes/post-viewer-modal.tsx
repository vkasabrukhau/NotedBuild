import type { ReactNode } from "react";
import { renderNoteContent } from "@/lib/render-note-content";
import { formatAuthoredDate } from "@/lib/text-utils";

type PostViewerModalNote = {
  content: string;
  createdAt: string;
  name: string;
  publishedAt: string | null;
};

type PostViewerModalProps = {
  note: PostViewerModalNote | null;
  topMeta?: ReactNode;
  actions?: ReactNode;
  owner?: ReactNode;
  footer?: ReactNode;
  overlayClassName?: string;
  maxWidthClassName?: string;
  titleClassName?: string;
};

export default function PostViewerModal({
  note,
  topMeta,
  actions,
  owner,
  footer,
  overlayClassName = "z-40 bg-black/20",
  maxWidthClassName = "max-w-5xl",
  titleClassName = "max-w-4xl text-[38px] font-bold leading-[1.02] text-black",
}: PostViewerModalProps) {
  if (!note) {
    return null;
  }

  const renderedContent = renderNoteContent(note.content);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center px-6 py-8 ${overlayClassName}`}
    >
      <div
        className={`max-h-full w-full overflow-y-auto rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.12)] ${maxWidthClassName}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-h-[32px] flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black/45">
            {topMeta}
          </div>
          {actions}
        </div>

        {owner ? <div className="mt-6">{owner}</div> : null}

        <p className={`${owner ? "mt-2" : "mt-6"} text-[13px] text-black/45`}>
          {formatAuthoredDate(note.publishedAt ?? note.createdAt)}
        </p>

        <h2 className={`mt-6 ${titleClassName}`}>{note.name}</h2>

        <div
          className="prose prose-lg mt-8 max-w-none text-black"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {footer ? (
          <div className="mt-10 border-t border-black/10 pt-8">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
