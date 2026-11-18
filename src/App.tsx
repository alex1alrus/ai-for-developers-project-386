import { Anchor, AppShell, Container, Group } from '@mantine/core'
import { Link, Navigate, Route, Routes } from 'react-router'
import BookingPage from './pages/BookingPage.tsx'
import CatalogPage from './pages/CatalogPage.tsx'
import HomePage from './pages/HomePage.tsx'
import OwnerArea from './pages/OwnerArea.tsx'
import OwnerEventTypesPage from './pages/OwnerEventTypesPage.tsx'

export default function App() {
  return (
    <AppShell header={{ height: 56 }}>
      <AppShell.Header>
        <Container h="100%">
          <Group h="100%" justify="space-between">
            <Anchor component={Link} to="/" fw={700} underline="never">
              Запись на звонок
            </Anchor>
            <Anchor component={Link} to="/owner">
              Владельцу
            </Anchor>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container py="xl">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/book" element={<CatalogPage />} />
            <Route path="/book/:eventTypeId" element={<BookingPage />} />
            <Route path="/owner" element={<OwnerArea />}>
              {/* Spec #12: /owner goes to bookings once that tab exists. */}
              <Route index element={<Navigate to="event-types" replace />} />
              <Route path="event-types" element={<OwnerEventTypesPage />} />
            </Route>
          </Routes>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
