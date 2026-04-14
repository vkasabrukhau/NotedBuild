"use client";

import Image from "next/image";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <div className="landing-root">
      {/* Nav */}
      <nav className="landing-nav">
        <span className="landing-nav-logo">
          <span className="landing-nav-logo-noted">Noted</span>
        </span>
        <div className="landing-nav-actions">
          <SignInButton mode="modal">
            <button type="button" className="landing-btn-signin">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button type="button" className="landing-btn-signup">
              Get started
            </button>
          </SignUpButton>
        </div>
      </nav>

      {/* Section 1: Hero */}
      <section className="landing-hero">
        {/* Heading + characters, layered together */}
        <div className="landing-hero-stage">
          {/* Guy sitting on "Make" */}
          <div className="landing-char landing-char-guy">
            <Image
              src="/landingpageassets/guysittinglandingpage.png"
              alt=""
              width={272}
              height={457}
              priority
              draggable={false}
            />
          </div>

          {/* Heading text */}
          <h1 className="landing-heading">
            <span className="landing-heading-regular">
              Life gets busy, make sure it's all{" "}
            </span>
            <span className="landing-heading-noted">Noted</span>
          </h1>

          {/* Girl standing on "N" in "Noted" */}
          <div className="landing-char landing-char-girl">
            <Image
              src="/landingpageassets/girlstandinglangingpage.png"
              alt=""
              width={245}
              height={869}
              priority
              draggable={false}
            />
          </div>
        </div>

        {/* Background image anchored to bottom */}
        <div className="landing-background">
          <Image
            src="/landingpageassets/landingbackground.png"
            alt=""
            width={1200}
            height={675}
            priority
            draggable={false}
          />
        </div>
      </section>

      {/* Section 2 */}
      <section className="landing-s2">
        <div className="landing-s2-left">
          <p className="landing-s2-headline">
            <span className="landing-s2-roboto">{"Designed to\nHelp You\nDo, Think, & Create\n"}</span>
            <span className="landing-s2-doto">Without Chaos</span>
          </p>
        </div>

        <div className="landing-s2-right">
          <p className="landing-s2-sub">
            {"Our note taking app drives\nmeaningful cross-institution\ncollaboration in STEM research\nwhile staying sexy."}
          </p>
        </div>
      </section>
    </div>
  );
}
