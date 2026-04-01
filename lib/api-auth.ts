import { currentUser } from "@clerk/nextjs/server";
import { syncClerkUserToDb } from "@/lib/sync-clerk-user";

export async function getOrCreateDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  return syncClerkUserToDb(clerkUser);
}
