import type { ReactNode } from "react";

type NoteCardStackProps = {
  topBar?: ReactNode;
  topBarMinHeightClassName?: string;
  header?: ReactNode;
  headerMinHeightClassName?: string;
  title: ReactNode;
  preview: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function NoteCardStack({
  topBar,
  topBarMinHeightClassName = "min-h-[32px]",
  header,
  headerMinHeightClassName = "min-h-[46px]",
  title,
  preview,
  footer,
  className = "",
}: NoteCardStackProps) {
  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className={topBarMinHeightClassName}>{topBar}</div>
      {header ? (
        <div className={`mt-5 ${headerMinHeightClassName}`}>{header}</div>
      ) : null}
      <div className="mt-5">{title}</div>
      {preview !== null && preview !== undefined ? (
        <div className="mt-4">{preview}</div>
      ) : null}
      {footer ? <div className="mt-auto pt-6">{footer}</div> : null}
    </div>
  );
}
