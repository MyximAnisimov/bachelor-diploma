import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BoardListPage } from './components/BoardListPage';
import { BoardPage } from './components/BoardPage';
import { HomePage } from './pages/HomePage';

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/boards/:boardUuid" element={<BoardPage />} />
    </Routes>
  </BrowserRouter>
);