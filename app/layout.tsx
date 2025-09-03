import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

export const metadata = {
  title: "RailEats",
  description: "Ab Rail Journey ka Swad Only Raileats ke Saath!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        {/* Fixed Top Navbar */}
        <Navbar />

        {/* Main Content with top+bottom padding */}
        <main className="pt-16 pb-16 max-w-6xl mx-auto">{children}</main>

        {/* Fixed Bottom Navbar */}
        <BottomNav />
      </body>
    </html>
  );
}
