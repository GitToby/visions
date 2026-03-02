import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { HouseCard } from '@/features/houses/HouseCard'
import type { components } from '@/lib/api/schema'

type House = components['schemas']['HouseResponse']

const mockHouse: House = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Beach House',
  owner_id: '123e4567-e89b-12d3-a456-426614174001',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  room_count: 3,
}

function renderCard(onDelete = vi.fn()) {
  return render(
    <BrowserRouter>
      <HouseCard house={mockHouse} onDelete={onDelete} />
    </BrowserRouter>,
  )
}

describe('HouseCard', () => {
  it('renders the house name and room count', () => {
    renderCard()
    expect(screen.getByText('Beach House')).toBeInTheDocument()
    expect(screen.getByText('3 rooms')).toBeInTheDocument()
  })

  it('calls onDelete with the house id when delete is clicked', async () => {
    const onDelete = vi.fn()
    renderCard(onDelete)
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith(mockHouse.id)
  })

  it('links to the house detail page', () => {
    renderCard()
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      `/houses/${mockHouse.id}`,
    )
  })

  it('uses singular "room" for room_count of 1', () => {
    const singleRoom = { ...mockHouse, room_count: 1 }
    render(
      <BrowserRouter>
        <HouseCard house={singleRoom} onDelete={vi.fn()} />
      </BrowserRouter>,
    )
    expect(screen.getByText('1 room')).toBeInTheDocument()
  })
})
