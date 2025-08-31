import "./globals.css"
import BottomNav from "./components/BottomNav"

export const metadata = {
  title: "RailEats",
  description: "Food Delivery in Trains - RailEats.in",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        {/* 🔝 Desktop Navbar */}
        <header className="hidden md:flex justify-between items-center px-10 py-4 bg-black text-white">
          <div className="text-2xl font-bold">🚆 RailEats</div>
          <nav className="flex gap-6 text-sm">
            <a href="/">Home</a>
            <a href="/tools">Train Tools</a>
            <a href="/offers">Offers</a>
            <a href="/orders">Orders</a>
            <a href="/menu">Menu</a>
          </nav>
        </header>

        {/* Page Content */}
        <main>{children}</main>

        {/* 🔻 Mobile Bottom Nav */}
        <BottomNav />

        {/* Footer */}
        <footer className="bg-black text-white text-center py-4 mt-10">
          <p>© 2025 RailEats.in | Fresh Food on Trains</p>
        </footer>
      </body>
    </html>
  )
}
