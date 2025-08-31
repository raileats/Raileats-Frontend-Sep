import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";
import BottomNav from "./components/BottomNav";

export default function Home() {
  return (
    <main className="bg-yellow-100 min-h-screen pb-20">
      <HeroSlider />
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold">Welcome to RailEats.in</h1>
        <p className="mt-2 text-lg">Ab Rail Journey ka Swad Only RailEats ke Saath</p>
      </div>
      <SearchBox />
      <Offers />
      <Steps />
      <ExploreRailInfo />
      <BottomNav />
    </main>
  );
}
