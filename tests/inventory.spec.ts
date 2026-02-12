import { test, expect } from '@playwright/test';

test.describe('Inventário', () => {
    test.beforeEach(async ({ page }) => {
        // Mock login
        await page.goto('/login');
        await page.fill('input[type="email"]', process.env.TEST_EMAIL || 'admin@example.com');
        await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'admin123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');

        await page.goto('/inventory');
    });

    test('deve criar um novo ativo', async ({ page }) => {
        await page.click('text=Novo Ativo');

        // Preencher formulário
        await page.fill('input[placeholder="Ex: PC-RH-001"]', 'Automated Test Asset');
        await page.selectOption('select', { label: 'Computador' }); // Select by label might be tricky if not labelled correctly
        // Better selectors:
        await page.fill('input[placeholder="SN-XXXXX"]', `AUTO-${Date.now()}`);

        // Submit
        await page.click('button:has-text("Cadastrar Ativo")');

        // Check success toast
        await expect(page.locator('text=Ativo cadastrado com sucesso!')).toBeVisible();
    });

    test('deve filtrar ativos', async ({ page }) => {
        await page.fill('input[placeholder="Buscar por nome, serial, responsável..."]', 'Automated');
        // Esperar debounce
        await page.waitForTimeout(500);

        // Verificar se aparece na lista
        await expect(page.locator('text=Automated Test Asset')).toBeVisible();
    });
});
