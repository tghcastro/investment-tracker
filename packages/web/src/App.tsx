import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { TopNav } from './components/ui';
import Accounts from './pages/Accounts';
import Home from './pages/Home';
import Holdings from './pages/Holdings';
import './App.css';

function AppLayout() {
  return (
    <div className="cb-app">
      <TopNav />
      <main className="cb-app__main">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/holdings" element={<Holdings />} />
          <Route path="/accounts" element={<Accounts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
