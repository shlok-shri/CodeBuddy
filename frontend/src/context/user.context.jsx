import React, { createContext, useContext, useState } from 'react'
import axios from '../config/axios'

export const userContext = createContext()

export const UserProvider = ({children}) => {
    const [user, setUser] = useState(null)

    const fetchUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await axios.get('/users/profile');
                setUser(response.data.user);
            } catch (error) {
                console.log(error);
                localStorage.removeItem('token');
                setUser(null);
            }
        }
    };

    return (
        <userContext.Provider value={{ user, setUser, fetchUser }}>
            {children}
        </userContext.Provider>
    );
};

export const useUser = () => {
    return useContext(userContext)
}