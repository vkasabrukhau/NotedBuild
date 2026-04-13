import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import ExplorePage from "@/components/explore/explore-page";

export default async function ExploreRoute() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return <ExplorePage />;
}
