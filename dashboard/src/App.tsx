import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Meeting from './pages/Meeting';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/meeting/:meetingId" element={<Meeting />} />
    </Routes>
  );
}
