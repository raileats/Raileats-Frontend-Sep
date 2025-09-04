"use client";
import Link from "next/link";

export default function MyMenuPage() {
  return (
    <main className="mx-auto w-full max-w-screen-md p-4 space-y-5">
      <h1 className="text-xl font-semibold">My Menu</h1>

      {/* 1) Profile */}
      <section id="profile" className="scroll-mt-16">
        <Card title="Profile">
          <List>
            <Item href="#" label="My Profile" sub="Update name, phone & address" idTarget="profile" />
            <Item href="#" label="My Orders" sub="Track your recent orders" idTarget="orders" />
            <Item href="#" label="Wallet Balance" sub="View & add money" idTarget="wallet" />
          </List>
        </Card>
      </section>

      {/* 2) Services */}
      <section id="services" className="scroll-mt-16">
        <Card title="Services">
          <List>
            <Item href="#" label="Bulk Order Query" idTarget="bulk" />
          </List>
        </Card>
      </section>

      {/* 3) Help & Support */}
      <section id="help" className="scroll-mt-16">
        <Card title="Help & Support">
          <List>
            <Item href="#" label="Contact Us" idTarget="contact" />
            <Item href="#" label="Feedback" idTarget="feedback" />
          </List>
        </Card>
      </section>

      {/* 4) About */}
      <section id="about" className="scroll-mt-16">
        <Card title="About RailEats">
          <List>
            <Item href="#" label="About Us" idTarget="about" />
            <Item href="#" label="FAQ" idTarget="faq" />
            <Item href="#" label="Terms & Conditions" idTarget="terms" />
            <Item href="#" label="Privacy Policy" idTarget="privacy" />
            <Item href="#" label="Cancellation Policy" idTarget="cancel" />
          </List>
        </Card>
      </section>

      {/* 5) Contact info */}
      <section id="contactinfo" className="scroll-mt-16">
        <Card title="Contact Information">
          <div className="text-sm text-gray-700 space-y-1">
            <p>Email: <a href="mailto:railrats@gmail.com" className="text-yellow-700">railrats@gmail.com</a></p>
            <p>Call Center: <a href="tel:1111111111" className="text-yellow-700">1111111111</a></p>
          </div>
        </Card>
      </section>
    </main>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function List({ children }: any) {
  return <ul className="divide-y">{children}</ul>;
}

function Item({ label, sub, href = "#", idTarget }: any) {
  return (
    <li className="py-3">
      <Link href={href} className="flex items-start justify-between hover:text-yellow-700">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
        <span>›</span>
      </Link>
    </li>
  );
}
