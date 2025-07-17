import React, { useContext } from 'react';
import { Route, BrowserRouter, Routes } from 'react-router-dom';
import Login from '../screens/Login';
import Register from '../screens/Register';
import Home from '../screens/Home';
import Project from '../screens/Project';
import LandingPage from '../screens/Landing';
import { userContext } from '../context/user.context';
import UserAuth from '../auth/UserAuth';

const AppRoutes = () => {
  const { user } = useContext(userContext);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <UserAuth><Home /></UserAuth>
            ) : (
              <LandingPage />
            )
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/project/:projectId" element={<UserAuth><Project /></UserAuth>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
