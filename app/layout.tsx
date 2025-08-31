import './globals.css';
import React from 'react';
export const metadata = { title: 'RailEats', description: 'अब रेल यात्रा का स्वाद, सिर्फ RailEats के साथ' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="bg-black text-white">{children}</body></html>);
}