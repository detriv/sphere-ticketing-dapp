import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { MyEventsPage } from './pages/MyEventsPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { TicketHoldersPage } from './pages/TicketHoldersPage';

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/event/:eventId" element={<EventDetailPage />} />
          <Route path="/event/:eventId/holders" element={<TicketHoldersPage />} />
          <Route path="/create" element={<CreateEventPage />} />
          <Route path="/my-events" element={<MyEventsPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/ticket/:eventId/:tokenId" element={<TicketDetailPage />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
