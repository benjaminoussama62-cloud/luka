"use client";

import { AyebaWordmark } from "@/components/brand/AyebaIcon";

export function SplashHero() {
  return (
    <div className="ayeba-splash-hero ayeba-splash-hero-cinematic">
      <h1 className="m-0 leading-none">
        <AyebaWordmark size="hero" />
      </h1>
      <p className="ayeba-splash-quote">Le monde entier, une requête.</p>
    </div>
  );
}
