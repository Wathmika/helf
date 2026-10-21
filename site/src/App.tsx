import { Nav } from './components/Nav'
import { Hero } from './sections/Hero'
import { ScanSimulation } from './sections/ScanSimulation'
import { WaysToCarry } from './sections/WaysToCarry'
import { PrivacyDemo } from './sections/PrivacyDemo'
import { Features } from './sections/Features'
import { Situations } from './sections/Situations'
import { HowItWorks } from './sections/HowItWorks'
import { Pricing } from './sections/Pricing'
import { Responders } from './sections/Responders'
import { Faq } from './sections/Faq'
import { CtaFooter } from './sections/CtaFooter'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <ScanSimulation />
        <WaysToCarry />
        <PrivacyDemo />
        <Features />
        <Situations />
        <HowItWorks />
        <Pricing />
        <Responders />
        <Faq />
      </main>
      <CtaFooter />
    </>
  )
}
