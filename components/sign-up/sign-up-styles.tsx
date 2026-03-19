export default function SignUpStyles() {
  return (
    <style jsx global>{`
      @keyframes schoolSuggestionUp {
        0% {
          opacity: 0;
          transform: translateY(18px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes schoolSuggestionDown {
        0% {
          opacity: 0;
          transform: translateY(-18px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .sign-up-panel {
        transition:
          opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
          filter 520ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .completion-overlay {
        transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .school-search-display {
        letter-spacing: -0.045em;
        line-height: 1.05;
      }
    `}</style>
  );
}
