import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CifraFormPage } from './pages/CifraFormPage';
import { CifraPage } from './pages/CifraPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyCifrasPage } from './pages/MyCifrasPage';
import { MyPlaylistsPage } from './pages/MyPlaylistsPage';
import { PlaylistManagePage } from './pages/PlaylistManagePage';
import { PlaylistPage } from './pages/PlaylistPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { RegisterPage } from './pages/RegisterPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="cifra/:slug" element={<CifraPage />} />
            <Route path="playlists" element={<PlaylistsPage />} />
            <Route path="playlist/:slug" element={<PlaylistPage />} />
            <Route path="entrar" element={<LoginPage />} />
            <Route path="cadastrar" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="minhas" element={<MyCifrasPage />} />
              <Route path="enviar" element={<CifraFormPage mode="create" />} />
              <Route path="editar/:id" element={<CifraFormPage mode="edit" />} />
              <Route path="minhas-playlists" element={<MyPlaylistsPage />} />
              <Route path="minhas-playlists/:id" element={<PlaylistManagePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
