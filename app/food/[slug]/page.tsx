import Link from "next/link";
import type { Metadata } from "next";

const SITE_URL = "https://www.raileats.in";

type Category = {
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  foods: string[];
};

const CATEGORIES: Category[] = [
  { slug: "pure-veg-food-in-train", name: "Pure Veg Food", title: "Pure Veg Food in Train | RailEats", description: "Find pure vegetarian food options for your train journey and order from available RailEats restaurants at eligible stations.", intro: "Looking for pure vegetarian food during a train journey? RailEats helps you discover available restaurants and vegetarian meals on your route. Enter your PNR, train number or station to see current delivery options.", foods: ["Veg thali", "Paneer meals", "Dal and rice", "Vegetable curries", "Breakfast and snacks"] },
  { slug: "jain-food-in-train", name: "Jain Food", title: "Jain Food in Train | RailEats", description: "Explore Jain-friendly food options for train journeys and check available restaurants by PNR, train or station.", intro: "RailEats helps passengers looking for Jain-friendly meals check available food options along their train route. Availability depends on the restaurant, station and journey date.", foods: ["Jain thali", "Jain meal combinations", "Vegetarian meals", "Rice and dal options", "Jain-friendly snacks"] },
  { slug: "biryani-in-train", name: "Biryani", title: "Biryani in Train | Order Biryani for Train Journey | RailEats", description: "Find available biryani options for train delivery at eligible railway stations with RailEats.", intro: "Craving biryani during your train journey? Use RailEats to check restaurants and menus available on your route and choose a delivery station before ordering.", foods: ["Veg biryani", "Chicken biryani", "Biryani meals", "Rice combinations", "Regional biryani options"] },
  { slug: "pizza-in-train", name: "Pizza", title: "Pizza in Train | RailEats", description: "Check available pizza and fast-food options for delivery during your train journey.", intro: "Passengers can use RailEats to check whether pizza and related fast-food options are available at stations on their route. Restaurant availability changes by station and journey date.", foods: ["Veg pizza", "Paneer pizza", "Cheese pizza", "Pizza meals", "Fast-food sides"] },
  { slug: "thali-in-train", name: "Thali", title: "Thali in Train | Veg Thali & Meals | RailEats", description: "Find thali and complete meal options available for delivery during train journeys.", intro: "A thali can be a convenient choice for a complete train meal. RailEats lets you check available restaurants, menus and delivery stations for your journey.", foods: ["Mini thali", "Veg thali", "Deluxe thali", "North Indian meals", "Regional thali options"] },
  { slug: "south-indian-food-in-train", name: "South Indian Food", title: "South Indian Food in Train | RailEats", description: "Find South Indian food options such as idli, dosa and meals for eligible train journeys.", intro: "Looking for South Indian food while travelling by train? Check RailEats for restaurants serving South Indian dishes at eligible delivery stations.", foods: ["Idli sambar", "Dosa", "Vada", "Upma", "South Indian meals"] },
  { slug: "chinese-food-in-train", name: "Chinese Food", title: "Chinese Food in Train | RailEats", description: "Explore available Chinese and Indo-Chinese food options for delivery during train journeys.", intro: "Passengers can browse available Chinese and Indo-Chinese meals from restaurants serving their train route. Actual availability depends on station and restaurant status.", foods: ["Noodles", "Fried rice", "Manchurian", "Chowmein", "Indo-Chinese combos"] },
  { slug: "breakfast-in-train", name: "Breakfast", title: "Breakfast in Train | Order Breakfast for Your Journey | RailEats", description: "Find breakfast options for train journeys and check available restaurants before your delivery station arrives.", intro: "Start your journey with a convenient breakfast. RailEats helps you check available breakfast menus at eligible railway stations on your route.", foods: ["Poha", "Idli and vada", "Paratha", "Sandwiches", "Tea and breakfast combos"] },
  { slug: "non-veg-food-in-train", name: "Non-Veg Food", title: "Non-Veg Food in Train | RailEats", description: "Explore available non-vegetarian food options for train delivery at eligible railway stations.", intro: "If you prefer non-vegetarian meals, RailEats helps you check available restaurants and menus for your train journey. Availability depends on the selected station and journey date.", foods: ["Chicken meals", "Chicken biryani", "Egg dishes", "Non-veg thalis", "Regional non-veg meals"] },
];

export function generateStaticParams() { return CATEGORIES.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = CATEGORIES.find((item) => item.slug === slug);
  if (!category) return { title: "Train Food | RailEats" };
  return {
    title: category.title,
    description: category.description,
    alternates: { canonical: `${SITE_URL}/food/${category.slug}` },
    robots: { index: true, follow: true },
    openGraph: { title: category.title, description: category.description, url: `${SITE_URL}/food/${category.slug}`, type: "website" },
  };
}

export default async function FoodCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = CATEGORIES.find((item) => item.slug === slug);
  if (!category) return null;

  const related = CATEGORIES.filter((item) => item.slug !== category.slug).slice(0, 6);
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: category.title,
    description: category.description,
    url: `${SITE_URL}/food/${category.slug}`,
    isPartOf: { "@type": "WebSite", name: "RailEats", url: SITE_URL },
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 48px", color: "#172033" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, marginBottom: 18 }}>
        <Link href="/">Home</Link> <span aria-hidden>›</span> <Link href="/food-delivery-in-train">Train Food</Link> <span aria-hidden>›</span> <span>{category.name}</span>
      </nav>

      <section style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 20, padding: "24px 20px" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#c2410c" }}>RailEats Train Food</p>
        <h1 style={{ margin: "8px 0 0", fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.12 }}>{category.name} in Train</h1>
        <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.7, color: "#475569" }}>{category.intro}</p>
        <div style={{ marginTop: 18 }}><Link href="/" style={{ display: "inline-block", background: "#f97316", color: "white", padding: "11px 16px", borderRadius: 12, fontWeight: 800, textDecoration: "none" }}>Search PNR / Train / Station</Link></div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 24, margin: 0 }}>Popular {category.name} Options</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 14 }}>
          {category.foods.map((food) => <div key={food} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 15, background: "#fff", fontWeight: 700 }}>{food}</div>)}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24 }}>How to Order {category.name} in Train</h2>
        <ol style={{ lineHeight: 1.8, paddingLeft: 22 }}>
          <li>Enter your PNR, train number or delivery station on RailEats.</li>
          <li>Check the stations and restaurants available for your journey.</li>
          <li>Open the restaurant menu and select available {category.name.toLowerCase()} options.</li>
          <li>Choose your delivery station and complete the order.</li>
        </ol>
      </section>

      <section style={{ marginTop: 28, background: "#f8fafc", borderRadius: 18, padding: 20 }}>
        <h2 style={{ fontSize: 22, marginTop: 0 }}>Availability Depends on Your Journey</h2>
        <p style={{ lineHeight: 1.7, color: "#475569" }}>Restaurant menus and delivery availability can vary by train, station, journey date, arrival time and restaurant operating status. Always search your journey on RailEats to see the current options instead of relying on a static menu.</p>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2 style={{ fontSize: 24 }}>Explore More Train Food</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginTop: 12 }}>
          {related.map((item) => <Link key={item.slug} href={`/food/${item.slug}`} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 13, textDecoration: "none", color: "#0f172a", fontWeight: 700 }}>{item.name} in Train</Link>)}
        </div>
      </section>
    </main>
  );
}
