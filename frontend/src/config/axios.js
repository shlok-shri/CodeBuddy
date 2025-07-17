import axios from 'axios';

let axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// Always get the latest token from localStorage before each request
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosInstance;