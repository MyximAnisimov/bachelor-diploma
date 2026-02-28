import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BoardListPage } from './components/BoardListPage';
import { BoardPage } from './components/BoardPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BoardListPage />} />
        <Route path="/boards/:boardUuid" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  );
};