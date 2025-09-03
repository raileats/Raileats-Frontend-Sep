import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "RailEats",
  description: "Fresh Food on Trains",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* ✅ Navbar यहाँ रहेगा और हर page पर common दिखेगा */}
        <Navbar />
        {children}
      </body>
    </html>
  );
}
