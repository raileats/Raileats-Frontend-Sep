import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

export const metadata = {
  title: "RailEats",
  description: "Ab Rail Journey ka Swad Only RailEats ke Saath!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        {/* 🔝 Top Navbar fixed */}
        <div className="fixed top-0 left-0 w-full z-50">
          <Navbar />
        </div>

        {/* 🖥️ Main content (padding top + bottom so content navbar ke neeche aaye) */}
        <main className="pt-20 pb-20">{children}</main>

        {/* 🔻 Bottom Navbar fixed */}
        <div className="fixed bottom-0 left-0 w-full z-50">
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
