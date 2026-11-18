import { Anchor, AppShell, Container } from '@mantine/core'
import { Link, Route, Routes } from 'react-router'
import CatalogPage from './pages/CatalogPage.tsx'
import HomePage from './pages/HomePage.tsx'

export default function App() {
  return (
    <AppShell header={{ height: 56 }}>
      <AppShell.Header>
        <Container h="100%" display="flex" style={{ alignItems: 'center' }}>
          <Anchor component={Link} to="/" fw={700} underline="never">
            Запись на звонок
          </Anchor>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container py="xl">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/book" element={<CatalogPage />} />
          </Routes>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
