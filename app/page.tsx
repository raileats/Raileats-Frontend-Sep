import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";

export default function Home() {
  return (
    <main>
      {/* Banner/Slider */}
      <HeroSlider />

      {/* Search Section */}
      <SearchBox />

      {/* Content */}
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold">Welcome to Raileats.in</h1>
        <p className="mt-2 text-lg">Ab Rail Journey ka Swad Only Raileats ke Saath</p>
      </div>
    </main>
  );
}
