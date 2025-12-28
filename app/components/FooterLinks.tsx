"use client";
import Link from "next/link";

export default function FooterLinks() {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-base font-semibold">Explore</h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Profile */}
        <div>
          <p className="font-medium mb-1">Profile</p>
          <ul className="space-y-1">
            <li>
              <Link href="/menu#profile" className="text-gray-600 hover:text-yellow-700">
                My Profile
              </Link>
            </li>
            <li>
              <Link href="/menu#orders" className="text-gray-600 hover:text-yellow-700">
                My Orders
              </Link>
            </li>
            <li>
              <Link href="/menu#wallet" className="text-gray-600 hover:text-yellow-700">
                Wallet Balance
              </Link>
            </li>
          </ul>
        </div>

        {/* Services */}
        <div>
          <p className="font-medium mb-1">Services</p>
          <ul className="space-y-1">
            <li>
              <Link href="/menu#bulk" className="text-gray-600 hover:text-yellow-700">
                Bulk Order Query
              </Link>
            </li>
          </ul>
        </div>

        {/* Help & Support */}
        <div>
          <p className="font-medium mb-1">Help & Support</p>
          <ul className="space-y-1">
            <li>
              <Link href="/menu#contact" className="text-gray-600 hover:text-yellow-700">
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/menu#feedback" className="text-gray-600 hover:text-yellow-700">
                Feedback
              </Link>
            </li>
          </ul>
        </div>

        {/* About RailEats */}
        <div>
          <p className="font-medium mb-1">About RailEats</p>
          <ul className="space-y-1">
            <li>
              <Link href="/about" className="text-gray-600 hover:text-yellow-700">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/faq" className="text-gray-600 hover:text-yellow-700">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-gray-600 hover:text-yellow-700">
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="text-gray-600 hover:text-yellow-700">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/cancellation-refund" className="text-gray-600 hover:text-yellow-700">
                Cancellation Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Contact */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          Email:{" "}
          <a href="mailto:railrats@gmail.com" className="text-yellow-700">
            railrats@gmail.com
          </a>
        </p>
        <p>
          Call Center:{" "}
          <a href="tel:1111111111" className="text-yellow-700">
            1111111111
          </a>
        </p>
      </div>
    </div>
  );
}
