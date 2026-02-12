import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
    test('deve realizar login com sucesso', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', process.env.TEST_EMAIL || 'admin@example.com');
        await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'admin123');
        await page.click('button[type="submit"]');

        // Espera redirecionar para dashboard
        await expect(page).toHaveURL('/');
        await expect(page.locator('text=Bem-vindo')).toBeVisible();
    });

    test('deve exibir erro ao tentar logar com credenciais inválidas', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'wrong@example.com');
        await page.fill('input[type="password"]', 'wrongpass');
        await page.click('button[type="submit"]');

        // Espera toast de erro
        await expect(page.locator('text=Email ou senha incorretos')).toBeVisible();
    });
});
