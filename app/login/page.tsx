export default function LoginPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Customer Login</h1>
      <form className="mt-4 flex flex-col gap-2">
        <input
          type="text"
          placeholder="Enter Mobile Number"
          className="px-4 py-2 border border-gray-400 rounded-md"
        />
        <button className="bg-black text-white px-4 py-2 rounded-md">
          Send OTP
        </button>
      </form>
    </div>
  );
}
