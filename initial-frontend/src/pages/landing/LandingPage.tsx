import { Faq } from "@/pages/landing/sections/Faq"
import { Features } from "@/pages/landing/sections/Features"
import { Footer } from "@/pages/landing/sections/Footer"
import { Header } from "@/pages/landing/sections/Header"
import { Hero } from "@/pages/landing/sections/Hero"
import { HowItWorks } from "@/pages/landing/sections/HowItWorks"
import { Pricing } from "@/pages/landing/sections/Pricing"
import { PrivacyDemo } from "@/pages/landing/sections/PrivacyDemo"

export function LandingPage() {
  return (
    <div className="min-h-svh bg-white">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <PrivacyDemo />
        <Features />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
