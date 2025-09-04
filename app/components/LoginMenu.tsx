/* --- Simple OTP modal (demo OTP: 111111) --- */
function OTPLoginModal({
  onClose, onLoggedIn,
}: { onClose: () => void; onLoggedIn: (u: any) => void }) {
  const [step, setStep] = useState<"phone"|"otp">("phone");
  const [phone, setPhone] = useState(""); 
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Valid 10-digit phone required");
    setError(""); setStep("otp"); // mock
  };
  const verifyOtp = async () => {
    if (otp === "111111") {
      const u = { name: "RailEater", phone };
      localStorage.setItem("raileats_user", JSON.stringify(u));
      onLoggedIn(u); onClose();
    } else setError("Invalid OTP");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50">
      {/* position near top, not glued to very top */}
      <div className="mx-auto mt-10 md:mt-16 max-w-xs md:max-w-sm">
        <div className="rounded-xl bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base md:text-lg font-semibold">OTP Login</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-black text-lg leading-none">✕</button>
          </div>

          {step === "phone" ? (
            <>
              <input
                value={phone}
                onChange={(e)=>setPhone(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Phone number"
              />
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <button onClick={sendOtp} className="mt-3 w-full rounded-md bg-yellow-600 py-2 text-white hover:bg-yellow-700 text-sm">
                Send OTP
              </button>
              <p className="mt-2 text-[11px] text-gray-500">Demo OTP: <b>111111</b></p>
            </>
          ) : (
            <>
              <input
                value={otp}
                maxLength={6}
                onChange={(e)=>setOtp(e.target.value)}
                className="w-full rounded-md border px-3 py-2 tracking-widest text-center text-sm"
                placeholder="Enter 6-digit OTP"
              />
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <button onClick={verifyOtp} className="mt-3 w-full rounded-md bg-yellow-600 py-2 text-white hover:bg-yellow-700 text-sm">
                Verify & Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
