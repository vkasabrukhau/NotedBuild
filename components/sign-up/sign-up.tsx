"use client";
import SignInView from "@/components/sign-up/sign-up";
import { Sign } from "crypto"; 


export default function SignUpView() {
    // What do we need?
    // 1) Age
    // 2) What they want to use the app for (journaling, task managemen) ?? 
    // 1: Creating a view

    effect(() => {
        // Get the user id from clerk
        const { userId } = auth();
        
        // Check if the user exists in our database
        const dbStatus = await prisma.user.findUnique({
            where: {
                clerkId: userId,
            },
        });
        if (!dbStatus.matchedUser) {
            return <>SignInView</>;
    
            
}