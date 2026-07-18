import { test, expect } from '@playwright/test'

test.describe('public pages', () => {
  test('landing page renders the hero', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('converts visitors into customers')
  })

  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('login with bad credentials shows an error instead of navigating away', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('nobody@nexiora-dev-test.com')
    await page.getByLabel('Password').fill('definitely-wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText(/invalid|failed to sign in/i)).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('unknown embed id shows a not-found state, not a crash', async ({ page }) => {
    await page.goto('/chat/bot_this_does_not_exist')
    await expect(page.getByRole('heading', { name: 'Chatbot not found' })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('route protection', () => {
  test('an unauthenticated visitor hitting the dashboard is redirected to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('an unauthenticated visitor hitting a deep dashboard route is redirected to login', async ({ page }) => {
    await page.goto('/dashboard/billing')
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('404', () => {
  test('an unmatched route renders the not-found page, not a blank screen', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist')
    expect(response?.ok()).toBe(true)
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
