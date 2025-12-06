import './App.css';
import { useState, useEffect } from 'react';

import Navbar from './components/NavBar';
import { Routes, Route, Link } from 'react-router-dom';
import Inventory from './pages/inventory';
import Log from './pages/log';

const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowDimensions;
};

function App() {
  const [minified, setMinified] = useState(false);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
      setMinified(width < 768 ? true : false);
  }, [width]);

  return (
    <div className={`App ${minified ? 'minified' : ''}`}>
      <Navbar minified={minified}></Navbar>
      <Routes>
        <Route path="/" element={<Inventory minified={minified} />} />
        <Route path="/log" element={<Log />} />
      </Routes>
    </div>
  );
}

export default App;
