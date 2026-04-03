"use client";

import { useSyncExternalStore } from "react";
import { UserButton } from "@clerk/nextjs";

function subscribe() {
  return () => {};
}

export default function ClerkUserButton() {
  const isHydrated = useSyncExternalStore(subscribe, () => true, () => false);

  if (!isHydrated) {
    return null;
  }

  return <UserButton />;
}
