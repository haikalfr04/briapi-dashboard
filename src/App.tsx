import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import InputPage from './pages/InputPage';

export default function App() {
  return (
    <>
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/input" element={<InputPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
