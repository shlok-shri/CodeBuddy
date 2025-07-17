import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("userInfo");
    if (user) navigate("/");
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 text-white font-sans">
      {/* Hero Section */}
      <header className="flex flex-col items-center justify-center text-center py-24 px-6">
        <h1 className="text-5xl md:text-6xl font-extrabold text-blue-400 mb-4">CodeBuddy</h1>
        <p className="text-lg text-gray-300 max-w-xl mb-3">Your collaborative playground in the cloud.</p>
        <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl">
          Pair program, preview instantly, and build smarter—together.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white text-lg transition"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/register")}
            className="px-6 py-3 bg-transparent border border-blue-500 hover:bg-blue-500 hover:text-white rounded text-blue-400 text-lg transition"
          >
            Register
          </button>
        </div>
      </header>

      {/* Features */}
      <section className="py-16 bg-gray-900 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10 text-center">
          <div className="bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-xl transition">
            <h3 className="text-xl font-semibold text-blue-300 mb-2">Live Code Sharing</h3>
            <p className="text-gray-400 text-sm">
              Collaborate with friends, classmates, or your team in real-time. Code together, debug faster.
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-xl transition">
            <h3 className="text-xl font-semibold text-blue-300 mb-2">Instant Preview</h3>
            <p className="text-gray-400 text-sm">
              Auto-refreshing iframes let you see what you build immediately—no delays, just flow.
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-xl transition">
            <h3 className="text-xl font-semibold text-blue-300 mb-2">Developer-First Design</h3>
            <p className="text-gray-400 text-sm">
              VSCode-like interface, markdown docs, chat with timestamps, and Git-style structure.
            </p>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="bg-gray-950 py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">See it in Action</h2>
          <p className="text-gray-400 mb-8">Screenshots from real sessions built by devs like you.</p>
          <img
            src="/CodeBuddy.jpg"
            alt="CodeBuddy Interface"
            className="rounded-xl shadow-2xl border border-gray-700"
          />
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-blue-900 py-16 text-center px-6">
        <h2 className="text-3xl font-bold text-white mb-4">Start Coding with Your Buddies</h2>
        <p className="text-blue-200 mb-6">No setup. No friction. Just code.</p>
        <button
          onClick={() => navigate("/register")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-800 font-semibold rounded hover:bg-blue-100 transition"
        >
          Get Started <ArrowRight size={18} />
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 text-center py-6 text-sm">
        <div className="mb-2">
          <a href="#" className="mx-2 hover:text-white">Terms</a> |
          <a href="#" className="mx-2 hover:text-white">Privacy</a> |
          <a href="#" className="mx-2 hover:text-white">Contact</a>
        </div>
        <p>&copy; {new Date().getFullYear()} CodeBuddy. Built with ❤️ by devs, for devs.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
