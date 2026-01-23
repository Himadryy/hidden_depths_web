'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isTransitioning: false,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [isTransitioning, setIsTransitioning] = useState(true);

  useEffect(() => {
    // CIRCADIAN RHYTHM LOGIC
    const checkTime = () => {
      const hour = new Date().getHours();
      // Day is 6 AM to 6 PM (18:00)
      const isDay = hour >= 6 && hour < 18;
      const newTheme = isDay ? 'light' : 'dark';
      
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      setIsTransitioning(false);
      
      console.log(`[CircadianSystem] Time: ${hour}:00. Setting Theme: ${newTheme}`);
    };

    checkTime();
    
    // Check every minute just in case
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
};
