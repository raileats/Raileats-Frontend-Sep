import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

export const metadata = {
  title: "RailEats",
  description: "Fresh food on trains",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Navbar />
        <div className="main-content">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
