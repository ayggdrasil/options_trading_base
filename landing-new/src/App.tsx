import NavBar from "./components/layout/NavBar";
import Hero from "./components/sections/HeroSection";
import Feature from "./components/sections/FeatureSection";
// import Trending from "./components/sections/TrendingSection";
import FAQ from "./components/sections/FAQSection";
import FootBar from "./components/layout/FootBar";
import EarlyAccess from "./components/sections/EarlyAccessSection";

function App() {
  return (
    <div className="flex flex-col items-center justify-center overflow-hidden">
      <NavBar />
      <main className="w-full pt-[72px]">
        <Hero />
        <Feature />
        {/* <Trending /> */}
        <FAQ />
        <EarlyAccess />
        {/* <StatsSection /> */}
        {/* <DividerSection videoVersion="v1" /> */}
        {/* <DividerSection videoVersion="v1" /> */}
        {/* <FeatureSection /> */}
        {/* <DividerSection videoVersion="v2" /> */}
        {/* <PartnerSection /> */}
      </main>
      <FootBar />
    </div>
  );
}

export default App;
