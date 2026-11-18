import { Stack, Tabs, Title } from '@mantine/core'
import { Outlet, useLocation, useNavigate } from 'react-router'

/** Owner area layout: tabs over the nested `/owner/*` pages. */
export default function OwnerArea() {
  const navigate = useNavigate()
  const tab = useLocation().pathname.split('/')[2]

  return (
    <Stack>
      <Title>Раздел владельца</Title>
      <Tabs value={tab} onChange={(value) => navigate(`/owner/${value}`)}>
        <Tabs.List>
          <Tabs.Tab value="bookings">Записи</Tabs.Tab>
          <Tabs.Tab value="event-types">Типы встреч</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <Outlet />
    </Stack>
  )
}
