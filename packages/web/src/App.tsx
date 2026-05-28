import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopNav } from './components/ui';
import AccountFormPage from './pages/AccountFormPage';
import Accounts from './pages/Accounts';
import HoldingFormPage from './pages/HoldingFormPage';
import Home from './pages/Home';
import Holdings from './pages/Holdings';
import Income from './pages/Income';
import Settings from './pages/Settings';
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
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/holdings/new" element={<HoldingFormPage mode="create" />} />
            <Route path="/holdings/:id" element={<HoldingFormPage mode="edit" />} />
            <Route path="/holdings" element={<Holdings />} />
            <Route path="/income" element={<Income />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/accounts/new" element={<AccountFormPage mode="create" />} />
            <Route path="/accounts/:id" element={<AccountFormPage mode="edit" />} />
            <Route path="/accounts" element={<Accounts />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
