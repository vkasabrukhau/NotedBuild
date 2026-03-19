export default function SignUpStyles() {
  return (
    <style jsx global>{`
      @keyframes authElementEnter {
        0% {
          opacity: 0;
          transform: translateY(18px) scale(0.985);
          filter: blur(10px);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
      }

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

      @keyframes schoolResultsPanelIn {
        0% {
          opacity: 0;
          transform: translateY(14px) scale(0.992);
          filter: blur(8px);
        }

        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
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

      .school-results-stage {
        position: relative;
        height: 28rem;
        overflow: hidden;
        border: 1px solid rgba(17, 24, 39, 0.08);
        border-radius: 2rem;
        background:
          linear-gradient(
            180deg,
            rgba(17, 24, 39, 0.03),
            rgba(17, 24, 39, 0.015)
          );
      }

      .school-results-empty {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        animation: schoolResultsPanelIn 540ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .school-results-panel {
        height: 100%;
        animation: schoolResultsPanelIn 540ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .school-results-scroll {
        overflow-y: auto;
        padding: 1rem 1.25rem;
        scrollbar-gutter: stable;
      }

      .auth-entry {
        opacity: 0;
        animation: authElementEnter 880ms cubic-bezier(0.22, 1, 0.36, 1) both;
        will-change: transform, opacity, filter;
      }

      .auth-input-surface {
        transition:
          transform 380ms cubic-bezier(0.22, 1, 0.36, 1),
          border-color 340ms ease,
          background-color 340ms ease,
          box-shadow 420ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .auth-input-surface:hover {
        transform: translateY(-1px);
      }

      .auth-input-surface:focus {
        transform: translateY(-2px);
        box-shadow: 0 18px 40px rgba(17, 24, 39, 0.08);
      }

      .auth-button {
        transition:
          transform 340ms cubic-bezier(0.22, 1, 0.36, 1),
          background-color 300ms ease,
          color 300ms ease,
          border-color 300ms ease,
          box-shadow 380ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 300ms ease;
      }

      .auth-button:hover:not(:disabled) {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 16px 32px rgba(17, 24, 39, 0.12);
      }

      .auth-button:active:not(:disabled) {
        transform: translateY(0) scale(0.985);
        box-shadow: 0 8px 16px rgba(17, 24, 39, 0.08);
      }

      .auth-link-action {
        transition:
          transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 300ms ease,
          color 300ms ease;
      }

      .auth-link-action:hover {
        transform: translateY(-1px);
      }

      .auth-choice-card {
        transition:
          transform 440ms cubic-bezier(0.22, 1, 0.36, 1),
          box-shadow 440ms cubic-bezier(0.22, 1, 0.36, 1),
          filter 440ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 320ms ease;
      }

      .auth-choice-card:hover {
        transform: translateY(-6px) scale(1.015);
        box-shadow: 0 24px 44px rgba(17, 24, 39, 0.12);
        filter: saturate(1.04);
      }

      .auth-choice-card:active {
        transform: translateY(-2px) scale(0.992);
      }

      .auth-guidance {
        transition:
          transform 480ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 380ms ease,
          color 380ms ease;
      }

      .auth-guidance-line {
        height: 1px;
        flex: 1 1 0%;
        background: rgba(17, 24, 39, 0.12);
        transition:
          background-color 380ms ease,
          transform 480ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 380ms ease;
      }

      .auth-guidance-dot {
        height: 0.55rem;
        width: 0.55rem;
        border-radius: 9999px;
        background: rgba(17, 24, 39, 0.18);
        transition:
          background-color 320ms ease,
          transform 480ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 320ms ease;
        animation: authGuidancePulse 1.8s ease-in-out infinite;
      }

      .auth-guidance-text {
        transition:
          transform 480ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 320ms ease,
          color 320ms ease,
          letter-spacing 320ms ease;
      }

      .auth-guidance--ready {
        transform: translateY(-2px);
      }

      .auth-guidance--ready .auth-guidance-line {
        background: rgba(17, 24, 39, 0.28);
        transform: scaleX(1.04);
      }

      .auth-guidance--ready .auth-guidance-dot {
        background: rgba(17, 24, 39, 0.8);
        transform: scale(1.15);
        animation: none;
      }

      .auth-guidance--ready .auth-guidance-text {
        letter-spacing: 0.18em;
      }

      @keyframes authGuidancePulse {
        0%,
        100% {
          opacity: 0.35;
          transform: scale(0.92);
        }

        50% {
          opacity: 0.8;
          transform: scale(1);
        }
      }
    `}</style>
  );
}
