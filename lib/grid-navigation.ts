export type GridArrowKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown";

export function findNextGridItemIndex(
  refs: Array<HTMLElement | null>,
  currentIndex: number,
  key: GridArrowKey,
) {
  const currentItem = refs[currentIndex];

  if (!currentItem) {
    return null;
  }

  const currentRect = currentItem.getBoundingClientRect();
  const currentCenterX = currentRect.left + currentRect.width / 2;
  const currentCenterY = currentRect.top + currentRect.height / 2;
  const currentHeight = currentRect.height;
  const currentWidth = currentRect.width;

  let nextIndex: number | null = null;
  let bestPrimaryDistance = Number.POSITIVE_INFINITY;
  let bestSecondaryDistance = Number.POSITIVE_INFINITY;

  refs.forEach((candidateItem, index) => {
    if (!candidateItem || index === currentIndex) {
      return;
    }

    const candidateRect = candidateItem.getBoundingClientRect();
    const candidateCenterX = candidateRect.left + candidateRect.width / 2;
    const candidateCenterY = candidateRect.top + candidateRect.height / 2;
    const deltaX = candidateCenterX - currentCenterX;
    const deltaY = candidateCenterY - currentCenterY;

    let primaryDistance = Number.POSITIVE_INFINITY;
    let secondaryDistance = Number.POSITIVE_INFINITY;

    if (key === "ArrowLeft" && deltaX < -8) {
      primaryDistance = Math.abs(deltaX);
      secondaryDistance = Math.abs(deltaY);
    }

    if (key === "ArrowRight" && deltaX > 8) {
      primaryDistance = Math.abs(deltaX);
      secondaryDistance = Math.abs(deltaY);
    }

    if (key === "ArrowUp" && deltaY < -8) {
      primaryDistance = Math.abs(deltaY);
      secondaryDistance = Math.abs(deltaX);
    }

    if (key === "ArrowDown" && deltaY > 8) {
      primaryDistance = Math.abs(deltaY);
      secondaryDistance = Math.abs(deltaX);
    }

    if (!Number.isFinite(primaryDistance)) {
      return;
    }

    const isHorizontalMove = key === "ArrowLeft" || key === "ArrowRight";
    const alignmentLimit = isHorizontalMove
      ? Math.max(72, currentHeight * 0.7)
      : Math.max(96, currentWidth * 0.8);
    const penalizedPrimary =
      secondaryDistance > alignmentLimit
        ? primaryDistance + alignmentLimit * 4
        : primaryDistance;

    if (
      penalizedPrimary < bestPrimaryDistance ||
      (penalizedPrimary === bestPrimaryDistance &&
        secondaryDistance < bestSecondaryDistance)
    ) {
      nextIndex = index;
      bestPrimaryDistance = penalizedPrimary;
      bestSecondaryDistance = secondaryDistance;
    }
  });

  return nextIndex;
}

export function focusGridItem(
  refs: Array<HTMLElement | null>,
  index: number,
  behavior: ScrollBehavior = "smooth",
) {
  const activeItem = refs[index];

  if (!activeItem) {
    return;
  }

  activeItem.focus({ preventScroll: true });
  activeItem.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior,
  });
}
