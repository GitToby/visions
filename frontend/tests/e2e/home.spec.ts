import { test, expect } from '@playwright/test'

test('redirects unauthenticated users to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('login page shows sign in with google button', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()
})

test('login page shows app name', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /visions/i })).toBeVisible()
})
