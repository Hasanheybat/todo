import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

test('debug — tasks page button click', async ({ page }) => {
  await loginAs(page, 'hasan')
  await page.goto('/tasks')
  await page.waitForTimeout(2000)

  // Count all buttons with "Tapşırıq əlavə et"
  const btns = page.locator('button:has-text("Tapşırıq əlavə et")')
  const count = await btns.count()
  console.log('Button count:', count)

  for (let i = 0; i < count; i++) {
    const btn = btns.nth(i)
    const box = await btn.boundingBox()
    const classes = await btn.getAttribute('class')
    console.log(`Button ${i}: box=${JSON.stringify(box)}, classes=${classes?.substring(0, 60)}`)
  }

  // Click the last button
  await btns.last().click()
  await page.waitForTimeout(1000)

  // Check what appeared
  const allInputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({
      placeholder: i.getAttribute('placeholder'),
      type: i.getAttribute('type'),
      visible: i.offsetHeight > 0,
    }))
  })
  console.log('Inputs after click:', JSON.stringify(allInputs.slice(0, 10)))

  // Take screenshot
  await page.screenshot({ path: 'tests/debug-screenshot.png' })

  // Check if modal opened
  const modal = page.locator('.fixed.inset-0')
  const modalVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false)
  console.log('Modal visible:', modalVisible)

  // Check any overlay
  const overlay = await page.evaluate(() => {
    const fixed = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el)
      return style.position === 'fixed' && el.getBoundingClientRect().height > 100
    })
    return fixed.map(el => el.className?.toString().substring(0, 80) + ' | ' + el.tagName).slice(0, 5)
  })
  console.log('Fixed elements:', overlay)

  expect(count).toBeGreaterThan(0)
})
