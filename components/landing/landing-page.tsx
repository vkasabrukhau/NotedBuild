"use client";

import Image from "next/image";
import { useEffect } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function LandingPage() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-animate]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root">
      {/* Nav */}
      <nav className="landing-nav landing-hero-load landing-hero-load--nav">
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
          <div className="landing-char landing-char-guy landing-hero-load landing-hero-load--guy">
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
          <h1 className="landing-heading landing-hero-load landing-hero-load--heading">
            <span className="landing-heading-regular">
              Life gets busy, make sure it's all{" "}
            </span>
            <span className="landing-heading-noted">Noted</span>
          </h1>

          {/* Girl standing on "N" in "Noted" */}
          <div className="landing-char landing-char-girl landing-hero-load landing-hero-load--girl">
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
        <div className="landing-background landing-hero-load landing-hero-load--bg">
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
        <div className="landing-s2-left" data-animate>
          <p className="landing-s2-headline">
            <span className="landing-s2-roboto">
              {"Designed to\nHelp You\nDo, Think, & Create\n"}
            </span>
            <span className="landing-s2-doto">Without Chaos</span>
          </p>
        </div>

        <div className="landing-s2-right" data-animate style={{ transitionDelay: "120ms" }}>
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
          <div className="s3-narrow-tall" data-animate>
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
          <div className="s3-narrow-sq" data-animate style={{ transitionDelay: "80ms" }}>
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
          <div className="s3-wide-short" data-animate style={{ transitionDelay: "160ms" }}>
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
          <div className="s3-wide-tall" data-animate style={{ transitionDelay: "240ms" }}>
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
          <div className="s3-right-tall" data-animate style={{ transitionDelay: "320ms" }}>
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

      {/* Section 4: Math */}
      <section className="landing-s4">
        <h2 className="landing-s4-title" data-animate>
          <span className="landing-s4-roboto">With /math[ ] LaTeX is </span>
          <span className="landing-s4-doto">Trivial</span>
        </h2>
        <div className="landing-s4-banner" data-animate style={{ transitionDelay: "100ms" }}>
          <div className="landing-s4-pill">
            <span className="landing-s4-pill-text">/math[]</span>
          </div>
        </div>
      </section>

      {/* Section 5: Stack */}
      <section className="landing-s5">
        <h2 className="landing-s5-title" data-animate>
          <span className="landing-s5-doto">Lightning </span>
          <span className="landing-s5-roboto">fast stack to power it all</span>
        </h2>
        <div className="landing-s5-grid">
          <div className="landing-s5-card landing-s5-card--dark" data-animate style={{ transitionDelay: "100ms" }}>
            <p className="landing-s5-card-title">TipTap Formatting</p>
            <div className="landing-s5-card-img">
              <Image
                src="/landingpageassets/tiptaplanding.png"
                alt=""
                width={300}
                height={300}
                draggable={false}
              />
            </div>
          </div>
          <div className="landing-s5-card" data-animate style={{ transitionDelay: "200ms" }}>
            <p className="landing-s5-card-title">Gemini Integration</p>
            <div className="landing-s5-card-img">
              <Image
                src="/landingpageassets/geminilanding.png"
                alt=""
                width={300}
                height={300}
                draggable={false}
              />
            </div>
          </div>
          <div className="landing-s5-card" data-animate style={{ transitionDelay: "300ms" }}>
            <p className="landing-s5-card-title">NextJS Framework</p>
            <div className="landing-s5-card-img">
              <Image
                src="/landingpageassets/nextjslanding.png"
                alt=""
                width={300}
                height={300}
                draggable={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Access */}
      <section className="landing-s6">
        <h2 className="landing-s6-title" data-animate>Access</h2>
        <div className="landing-s6-body" data-animate style={{ transitionDelay: "120ms" }}>
          <div className="landing-s6-image">
            <Image
              src="/landingpageassets/coffeelanding.png"
              alt=""
              width={600}
              height={600}
              draggable={false}
            />
          </div>
          <div className="landing-s6-card">
            <p className="landing-s6-caption">For Educator(s)</p>
            <SignUpButton mode="modal">
              <button type="button" className="landing-s6-btn landing-s6-btn--light">
                Sign Up
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button type="button" className="landing-s6-btn landing-s6-btn--light">
                Sign In
              </button>
            </SignInButton>
            <p className="landing-s6-caption landing-s6-caption--spaced">For Students</p>
            <button type="button" className="landing-s6-btn landing-s6-btn--blue">
              Beta Sign Up
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
