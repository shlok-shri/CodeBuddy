import React, { useContext, useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { UserProvider, userContext } from './context/user.context';

const AppInitializer = () => {
  const { fetchUser } = useContext(userContext);

  useEffect(() => {
    fetchUser();
  }, []);

  return <AppRoutes />;
};

const App = () => {
  return (
    <UserProvider>
      <AppInitializer />
    </UserProvider>
  );
};

export default App
