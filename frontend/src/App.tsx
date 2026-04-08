import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BoardPage } from './components/BoardPage';
import { AuthPage } from './pages/AuthPage';
import { OAuth2SuccessPage } from './pages/OAuth2SuccessPage';
import { MyBoardsPage } from './pages/MyBoardsPage';

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/oauth2/success" element={<OAuth2SuccessPage />} />

      <Route
        path="/me/boards"
        element={
          <RequireAuth>
            <MyBoardsPage />
          </RequireAuth>
        }
      />

      <Route path="/boards/:boardUuid" element={<BoardPage />} />

      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  </BrowserRouter>
);