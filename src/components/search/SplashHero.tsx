"use client";

import { AyebaWordmark } from "@/components/brand/AyebaIcon";

export function SplashHero() {
  return (
    <div className="ayeba-splash-hero ayeba-splash-hero-cinematic">
      <div className="ayeba-splash-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ayeba-splash-mark"
          src="/brand/ayeba-mark.svg"
          alt=""
          width={56}
          height={56}
          decoding="async"
        />
        <h1 className="m-0 leading-none">
          <AyebaWordmark size="hero" />
        </h1>
      </div>
      <p className="ayeba-splash-quote">Le monde entier, une requête.</p>
    </div>
  );
}
