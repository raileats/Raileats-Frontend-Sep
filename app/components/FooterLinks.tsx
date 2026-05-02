"use client";
import Link from "next/link";

export default function FooterLinks() {

  // 🔥 LOGIN CHECK FUNCTION
  const handleProtectedRoute = () => {
    const user = JSON.parse(localStorage.getItem("raileats_user") || "null");

    if (!user) {
      window.dispatchEvent(new CustomEvent("raileats:open-login"));
    } else {
      window.location.href = "/profile";
    }
  };

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-base font-semibold">Explore</h3>

      <div className="grid grid-cols-2 gap-3 text-sm">

        {/* Profile */}
        <div>
          <p className="font-medium mb-1">Profile</p>
          <ul className="space-y-1">

            <li>
              <button
                onClick={handleProtectedRoute}
                className="text-gray-600 hover:text-yellow-700 text-left"
              >
                My Profile
              </button>
            </li>

            <li>
              <button
                onClick={handleProtectedRoute}
                className="text-gray-600 hover:text-yellow-700 text-left"
              >
                My Orders
              </button>
            </li>

            <li>
              <button
                onClick={handleProtectedRoute}
                className="text-gray-600 hover:text-yellow-700 text-left"
              >
                Wallet Balance
              </button>
            </li>

          </ul>
        </div>

        {/* Help & Support */}
        <div>
          <p className="font-medium mb-1">Help & Support</p>
          <ul className="space-y-1">

            {/* Contact */}
            <li>
              <Link href="/contact" className="text-gray-600 hover:text-yellow-700">
                Contact Us
              </Link>
            </li>

            {/* 🔥 Feedback */}
            <li>
              <button
                onClick={() => {
                  const user = JSON.parse(localStorage.getItem("raileats_user") || "null");

                  if (!user) {
                    localStorage.setItem("afterLoginAction", "feedback");
                    window.dispatchEvent(new CustomEvent("raileats:open-login"));
                  } else {
                    window.dispatchEvent(new CustomEvent("raileats:open-feedback"));
                  }
                }}
                className="text-gray-600 hover:text-yellow-700 text-left"
              >
                Feedback
              </button>
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
