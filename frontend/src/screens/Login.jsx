import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { userContext } from '../context/user.context';

const Login = () => {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { setUser } = useContext(userContext)

  const navigate = useNavigate()

  function submitHandler(e) {

    e.preventDefault()

    axios
      .post('/users/login', {
        email,
        password,
      })
      .then((res) => {
        console.log(res.data);
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        setUser(user);
        navigate('/');
      })
      .catch((err) => {
        console.log(err.response.data)
      })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl shadow-2xl">
        <h2 className="text-3xl font-bold mb-6 text-center">Welcome Back</h2>
        <form className="space-y-5" onSubmit={submitHandler}>
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              onChange={(e) => { setEmail(e.target.value) }}
              type="email"
              id="email"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              onChange={(e) => { setPassword(e.target.value) }}
              type="password"
              id="password"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition duration-200"
          >
            Log In
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
          Don’t have an account?{' '}
          <Link to="/register" className="text-purple-500 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
