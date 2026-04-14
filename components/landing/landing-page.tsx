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
            <span className="landing-s2-roboto">
              {"Designed to\nHelp You\nDo, Think, & Create\n"}
            </span>
            <span className="landing-s2-doto">Without Chaos</span>
          </p>
        </div>

        <div className="landing-s2-right">
          <p className="landing-s2-sub">
            {
              "Our note taking app drives\nmeaningful cross-institution\ncollaboration in STEM research\nwhile staying sexy."
            }
          </p>
        </div>
      </section>

      {/* Section 3: Modular grid */}
      <section className="landing-s3">
        <div className="landing-s3-grid">
          <div className="s3-narrow-tall">
            <p className="s3-narrow-tall-text">
              {"Dive into\nintellectually\nstimulating\nwith "}
              <span className="s3-doto">diverse</span>
              {"\ninterests"}
            </p>
            <div className="s3-narrow-tall-img">
              <Image
                src="/landingpageassets/guyfallinglandingpage.png"
                alt=""
                width={400}
                height={400}
                draggable={false}
              />
            </div>
          </div>
          <div className="s3-narrow-sq">
            <p className="s3-narrow-sq-text">Infinite Organization</p>
            <div className="s3-narrow-sq-img">
              <Image
                src="/landingpageassets/fileiconlandingpage.png"
                alt=""
                width={400}
                height={400}
                draggable={false}
              />
            </div>
          </div>
          <div className="s3-wide-short">
            <p className="s3-wide-short-text">
              {"Cross\nUniversity\nCollaboration"}
            </p>
            <div className="s3-shields">
              {[
                { file: "dukeshieldlanding.png", width: 120 },
                { file: "princetonlanding.png", width: 120 },
                { file: "harvardlanding.png", width: 130 },
                { file: "upennshieldlanding.png", width: 180 },
                { file: "yalelanding.png", width: 150 },
              ].map(({ file, width }, i) => (
                <div
                  key={file}
                  className="s3-shield"
                  style={{ left: `${i * 90}px`, zIndex: i + 1 }}
                >
                  <Image
                    src={`/landingpageassets/universityshields/${file}`}
                    alt=""
                    width={120}
                    height={120}
                    style={{ width, height: "auto" }}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="s3-wide-tall">
            <p className="s3-wide-tall-header">たまごっち Friends</p>
            <p className="s3-wide-tall-sub">
              Tamagotchis accompany you on your note taking journey
            </p>
            <div className="s3-wide-tall-chars">
              <div className="s3-wide-tall-char">
                <Image
                  src="/landingpageassets/snorlaxlandingpage.png"
                  alt=""
                  width={400}
                  height={400}
                  draggable={false}
                />
              </div>
              <div className="s3-wide-tall-char">
                <Image
                  src="/landingpageassets/mewtwolandingpage.png"
                  alt=""
                  width={400}
                  height={400}
                  draggable={false}
                />
              </div>
              <div className="s3-wide-tall-char">
                <Image
                  src="/landingpageassets/bonelylandingpage.png"
                  alt=""
                  width={400}
                  height={400}
                  draggable={false}
                />
              </div>
            </div>
          </div>
          <div className="s3-right-tall">
            <p className="s3-right-tall-header">Ctrl + Shift +</p>
            <p className="s3-right-tall-sub">
              {"Don't miss a beat with a fully\nshortcuts based interface,\nno trackpad interaction\nrequired"}
            </p>
            <div className="s3-right-tall-img">
              <Image
                src="/landingpageassets/macintoshlanding.png"
                alt=""
                width={400}
                height={400}
                draggable={false}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
