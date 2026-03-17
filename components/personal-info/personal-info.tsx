"use client";

import { useEffect, useState } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { flushAllTraces } from "next/dist/trace";


type PersonalInfoViewProps = {
    clerkId: string;
    email: string;
    fullName: string;
};


export default function PersonalInfoView({
  clerkId,
  email,
  fullName,
}: PersonalInfoViewProps) {
  return (
    <form className="flex flex-col gap-4">
      <input value={fullName} readOnly />
      <input value={email} readOnly />

      <label htmlFor="age">Age</label>
      <input
        id="age"
        name="age"
        type="number"
        min={1}
        max={120}
        placeholder="Enter your age"
        required
      />

      <button type="submit">Let's Go</button>
    </form>
    
  );
}
