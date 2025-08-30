import './globals.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

export const metadata = {
  title: 'Raileats.in - Food Delivery in Train',
  description: 'Ab Rail Journey ka Swad Only Raileats ke Saath. Order food in train by PNR or Train Number.',
  keywords: ['food in train', 'order food PNR', 'raileats', 'railway food delivery']
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Ads Placeholder */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX"
          crossOrigin="anonymous"></script>
      </head>
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}
