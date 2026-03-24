import { reasonOptions } from "@/components/sign-up/constants";
import TypewriterText from "@/components/ui/typewriter-text";

type ReasonViewProps = {
  onSelectReason: (reason: string) => void;
};

export default function ReasonView({ onSelectReason }: ReasonViewProps) {
  return (
    <>
      <TypewriterText
        as="h1"
        className="mx-auto max-w-none text-center text-[2rem] font-semibold leading-tight tracking-[-0.05em] text-black sm:text-[3.6rem]"
        text="What are you using Noted for?"
      />

      <div className="mt-14 grid w-full gap-8 sm:grid-cols-2">
        {reasonOptions.map((reason, index) => (
          <button
            key={reason.label}
            type="button"
            onClick={() => onSelectReason(reason.label)}
            className={`auth-choice-card auth-entry flex min-h-[14rem] items-center justify-center rounded-[1.2rem] px-10 text-[2.45rem] font-medium tracking-[-0.04em] text-white ${reason.color}`}
            style={{ animationDelay: `${90 + index * 80}ms` }}
          >
            <span className="whitespace-nowrap">{reason.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
