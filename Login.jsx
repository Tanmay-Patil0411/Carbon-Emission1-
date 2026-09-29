import { useState } from "react";
import { Leaf, Mail, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    console.log({
      email,
      password,
    });

    // Navigate to Dashboard after backend integration
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-100 to-green-50 flex items-center justify-center p-6">

      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2">

        {/* Left Side */}
        <div className="bg-green-700 text-white flex flex-col justify-center items-center p-10">

          <Leaf size={70} />

          <h1 className="text-4xl font-bold mt-6">
            EcoTrace
          </h1>

          <p className="text-center mt-5 text-green-100">
            AI-Driven Industrial Carbon Footprint &
            <br />
            ESG Management Platform
          </p>

          <img
            src="https://cdn-icons-png.flaticon.com/512/427/427735.png"
            alt="eco"
            className="w-52 mt-10"
          />

        </div>

        {/* Right Side */}

        <div className="p-12 flex flex-col justify-center">

          <h2 className="text-3xl font-bold text-gray-800">
            Welcome Back
          </h2>

          <p className="text-gray-500 mt-2 mb-8">
            Login to your EcoTrace account
          </p>

          <form
            onSubmit={handleLogin}
            className="space-y-6"
          >

            {/* Email */}

            <div>
              <label className="font-medium text-gray-700">
                Company Email
              </label>

              <div className="flex items-center border rounded-xl mt-2 px-3">

                <Mail
                  size={18}
                  className="text-gray-500"
                />

                <input
                  type="email"
                  placeholder="company@email.com"
                  className="w-full p-3 outline-none"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />
              </div>
            </div>

            {/* Password */}

            <div>

              <label className="font-medium text-gray-700">
                Password
              </label>

              <div className="flex items-center border rounded-xl mt-2 px-3">

                <Lock
                  size={18}
                  className="text-gray-500"
                />

                <input
                  type="password"
                  placeholder="********"
                  className="w-full p-3 outline-none"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />

              </div>

            </div>

            <div className="flex justify-between items-center">

              <label className="flex items-center gap-2 text-sm">

                <input type="checkbox" />

                Remember Me

              </label>

              <button
                type="button"
                className="text-green-700 hover:underline"
              >
                Forgot Password?
              </button>

            </div>

            <button
              type="submit"
              className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition"
            >
              Login
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}