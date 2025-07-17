import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { userContext } from '../context/user.context';

const UserAuth = ({ children }) => {
    const { user } = useContext(userContext);
    const token = localStorage.getItem('token');
    const location = useLocation();

    if (token && !user) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default UserAuth;
