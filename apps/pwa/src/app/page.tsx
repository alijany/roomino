"use client";

import { RootLayout } from "@/components/layout/layout.component.root";
import { brand, type FeatureIconKey } from "@/config/brand.config";
import { Button, Card, Label } from "@/ui/atoms";
import {
  IconArrowLeft,
  IconCalendarStats,
  IconCheck,
  IconChevronDown,
  IconLayoutGrid,
  IconRepeat,
} from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";

const iconMap: Record<FeatureIconKey, React.ReactNode> = {
  calendar: <IconCalendarStats size={32} className="text-blue-500" />,
  board: <IconLayoutGrid size={32} className="text-indigo-500" />,
  repeat: <IconRepeat size={32} className="text-rose-500" />,
};

const { hero, features, workflow, cta, faq } = brand.landing;

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <RootLayout navbarTransparent>
      {/* HERO */}
      <section id="home" className="relative pt-12 md:pt-20 lg:pt-28 overflow-hidden">
        <Image
          src="/images/hero-bg.svg"
          alt="pattern"
          width={1200}
          height={600}
          className="absolute inset-0 h-screen w-full md:w-full md:h-auto object-cover pointer-events-none"
        />
        <div className="relative container max-w-5xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col items-center text-center space-y-6 sm:space-y-8">
          <Label>
            <span>{hero.label}</span>
          </Label>
          <h1 className="font-black text-3xl md:text-5xl lg:text-6xl !leading-snug">
            <span className="text-slate-800">{hero.heading1}</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600">
              {hero.heading2}
            </span>
          </h1>
          <p className="text-slate-600 text-md md:text-xl max-w-2xl">{hero.body}</p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-1">
            <a className="block" href="/login" rel="noreferrer">
              <Button size="lg" variant="primary" className="shadow-xl shadow-blue-500/20 text-white">
                {hero.cta1}
              </Button>
            </a>
            <a href="#features">
              <Button size="lg" variant="secondary">
                {hero.cta2}
              </Button>
            </a>
          </div>
        </div>

        <a
          href="#how-it-works"
          className="mt-16 relative z-10 mb-12 flex justify-center"
          aria-label="Scroll to next section"
        >
          <div className="bg-white w-8 h-12 rounded-full border-2 border-slate-300/60 flex items-start justify-center p-1">
            <span className="block w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" />
          </div>
        </a>

        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[140%] h-64 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-b from-white to-slate-50"
      >
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 md:px-8 text-center space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-slate-800">
            {brand.landing.workflowHeading}
          </h2>
          <p className="text-slate-600 text-lg">{brand.landing.workflowSubheading}</p>
        </div>
        <div className="mt-8 md:mt-16 container max-w-5xl mx-auto px-4 sm:px-6 md:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {workflow.map((w) => (
            <Card
              key={w.step}
              className="bg-white rounded-2xl border-b-4 border-slate-100 shadow-[0px_24px_40px_-16px_rgba(119,168,226,0.30)] p-6 flex flex-col"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-lg mb-4">
                {w.step}
              </div>
              <h3 className="font-semibold text-slate-700 mb-2">{w.title}</h3>
              <p className="text-sm text-slate-500 !leading-relaxed">{w.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-slate-50">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 md:px-8 text-center space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-slate-800">
            {brand.landing.featuresHeading}
          </h2>
          <p className="text-slate-600 text-lg">{brand.landing.featuresSubheading}</p>
        </div>
        <div className="mt-8 md:mt-16 container max-w-5xl mx-auto grid md:grid-cols-3 gap-8 px-4 sm:px-6 md:px-8">
          {features.map((f) => (
            <Card
              key={f.title}
              className="bg-white border-b-4 border-slate-100 shadow-[0px_24px_40px_-16px_rgba(119,168,226,0.30)] p-6 flex flex-col text-right"
            >
              <div className="mb-4">{iconMap[f.icon]}</div>
              <h3 className="font-semibold text-lg text-slate-700 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 !leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        id="cta"
        className="relative py-16 sm:py-20 md:py-24 lg:py-28 bg-slate-950 overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_100%_0%,rgba(129,140,248,0.2),transparent_55%),linear-gradient(to_bottom,rgba(15,23,42,1),rgba(15,23,42,1))]" />
        <div className="relative container max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] md:text-xs text-white/70 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{cta.badge}</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black !leading-snug text-white">
            {cta.heading1}
            <span className="block text-transparent bg-clip-text bg-gradient-to-l from-sky-400 via-indigo-300 to-rose-300">
              {cta.heading2}
            </span>
          </h2>
          <p className="text-sm md:text-base text-white/70 max-w-xl mx-auto">{cta.body}</p>

          <div className="grid sm:grid-cols-2 gap-3 text-xs md:text-sm max-w-xl mx-auto text-right">
            {cta.bullets.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm text-white/80"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <IconCheck size={14} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a className="block" href="/login" rel="noreferrer">
              <Button
                size="lg"
                variant="white"
                className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100 shadow-[0_18px_45px_-22px_rgba(15,23,42,0.9)] transition-transform duration-150 hover:-translate-y-0.5"
              >
                {cta.cta1}
              </Button>
            </a>
            <a className="block" href="#how-it-works" rel="noreferrer">
              <Button
                size="lg"
                variant="ghost"
                className="rounded-2xl border border-white/20 text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-2"
              >
                <span>{cta.cta2}</span>
                <IconArrowLeft size={18} />
              </Button>
            </a>
          </div>

          <p className="text-[11px] text-white/50 font-light">{cta.footnote}</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-12 sm:py-16 md:py-20 lg:py-28 bg-white overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 30% 20%,rgba(59,130,246,0.08),transparent 60%)" }}
        />
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl md:text-5xl font-black text-slate-800">{faq.heading}</h2>
            <p className="text-slate-600 mt-4 text-sm md:text-base">{faq.subheading}</p>
          </div>
          <div className="grid md:grid-cols-2 items-start gap-6">
            {faq.items.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <div
                  key={idx}
                  className={`group rounded-2xl border backdrop-blur bg-white/60 transition ${open ? "bg-white/80 border-slate-300" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : idx)}
                    className="w-full flex items-start justify-between gap-4 text-right p-5"
                    aria-expanded={open}
                    aria-controls={`faq-${idx}-panel`}
                  >
                    <span
                      className={`text-sm md:text-base font-medium !leading-relaxed text-right flex-1 ${open ? "text-slate-900" : "text-slate-700"}`}
                    >
                      {item.q}
                    </span>
                    <span
                      className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border text-slate-500 text-xs transition bg-white/70 ${open ? "border-slate-400" : "border-slate-300 group-hover:border-slate-400"}`}
                    >
                      <IconChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  <div
                    id={`faq-${idx}-panel`}
                    className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-6 pt-2 text-xs md:text-sm !leading-relaxed text-slate-600">
                        {item.a}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </RootLayout>
  );
}
