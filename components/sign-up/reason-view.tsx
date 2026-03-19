import { reasonOptions } from "@/components/sign-up/constants";

type ReasonViewProps = {
  onSelectReason: (reason: string) => void;
};

export default function ReasonView({ onSelectReason }: ReasonViewProps) {
  return (
    <>
      <h1 className="mx-auto max-w-none whitespace-nowrap text-center text-[2rem] leading-tight tracking-[-0.05em] text-black sm:text-[3.6rem]">
        Tell us what you use <span className="font-bold">Note</span> for?
      </h1>

      <div className="mt-14 grid w-full gap-8 sm:grid-cols-2">
        {reasonOptions.map((reason) => (
          <button
            key={reason.label}
            type="button"
            onClick={() => onSelectReason(reason.label)}
            className={`flex min-h-[14rem] items-center justify-center rounded-[1.2rem] px-10 text-[2.45rem] font-medium tracking-[-0.04em] text-white transition duration-500 ease-out hover:scale-[1.01] ${reason.color}`}
          >
            <span className="whitespace-nowrap">{reason.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
