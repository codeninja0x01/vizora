/**
 * E2E Tests: Text-to-Video Storyboard Wizard (LIVE API)
 *
 * These tests hit the real /api/ai/text-to-video endpoint which calls
 * Google Gemini for search query generation and Pexels/Pixabay for
 * stock footage. No mocks are used.
 *
 * Env vars required: GOOGLE_GENAI_API_KEY, PEXELS_API_KEY
 */
import { test, expect, type Page } from '@playwright/test';

const TEXT_TO_VIDEO_URL = '/dashboard/text-to-video';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Fill a scene description textarea by scene index (0-based). */
async function fillSceneDescription(page: Page, index: number, text: string) {
  const textareas = page.locator('textarea');
  await textareas.nth(index).fill(text);
}

/** Get the duration input for a scene by index (0-based). */
function getDurationInput(page: Page, index: number) {
  return page.locator('input[type="number"]').nth(index);
}

/** Get the text overlay input for a scene by index (0-based). */
function getOverlayInput(page: Page, index: number) {
  return page.locator('input[type="text"]').nth(index);
}

/** Click the "Add Scene" button. */
async function clickAddScene(page: Page) {
  await page.getByText('Add Scene').click();
}

/** Click the "Next" button (exact match to avoid Next.js dev tools button). */
async function clickNext(page: Page) {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
}

/** Click the "Back" button. */
async function clickBack(page: Page) {
  await page.getByRole('button', { name: /Back/i }).click();
}

/** Fill all default scenes with concrete, stock-searchable descriptions. */
async function fillAllDefaultScenes(page: Page) {
  await fillSceneDescription(page, 0, 'A golden sunrise over the ocean');
  await fillSceneDescription(
    page,
    1,
    'People walking through a busy city street'
  );
  await fillSceneDescription(
    page,
    2,
    'A calm forest with sunlight through trees'
  );
}

/**
 * Navigate from step 1 (scenes) through step 2 (style) to step 3 (generate).
 * Fills scenes if needed, then clicks Next twice.
 */
async function navigateToGenerateStep(page: Page) {
  await fillAllDefaultScenes(page);
  await clickNext(page); // to style
  await clickNext(page); // to generate
  // Wait for the summary to render
  await expect(
    page.getByRole('button', { name: /Generate Video/i })
  ).toBeVisible({ timeout: 10_000 });
}

// ── Tests ────────────────────────────────────────────────────────────────

test.describe('Text-to-Video Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEXT_TO_VIDEO_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/dashboard\/text-to-video/, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('h1')).toContainText('Text to Video', {
      timeout: 10_000,
    });
  });

  // ── Step 1: Page Load ──────────────────────────────────────────────

  test('should load the text-to-video page with wizard', async ({ page }) => {
    // Page header
    await expect(page.locator('h1')).toContainText('Text to Video');
    await expect(page.getByText('Describe your story')).toBeVisible();

    // Step indicators
    await expect(page.getByText('Scenes', { exact: true })).toBeVisible();
    await expect(page.getByText('Style', { exact: true })).toBeVisible();
    await expect(page.getByText('Generate', { exact: true })).toBeVisible();

    // Default 3 scenes
    const textareas = page.locator('textarea');
    await expect(textareas).toHaveCount(3);

    // Add Scene button
    await expect(page.getByText('Add Scene')).toBeVisible();

    // Next button disabled (empty descriptions)
    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextBtn).toBeDisabled();

    // Scene count display
    await expect(page.getByText(/3 scenes/)).toBeVisible();

    await page.screenshot({
      path: 'test-results/01-page-loaded.png',
      fullPage: true,
    });
  });

  // ── Step 1: Scene Management ───────────────────────────────────────

  test('should add a new scene', async ({ page }) => {
    const textareas = page.locator('textarea');
    await expect(textareas).toHaveCount(3);

    await clickAddScene(page);
    await expect(textareas).toHaveCount(4);
    await expect(page.getByText(/4 scenes/)).toBeVisible();
  });

  test('should fill scene description and enable Next button', async ({
    page,
  }) => {
    await fillSceneDescription(page, 0, 'A sunrise over the ocean');
    await fillSceneDescription(page, 1, 'Birds flying across the sky');
    await fillSceneDescription(page, 2, 'Waves crashing on the shore');

    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextBtn).toBeEnabled();
  });

  test('should edit scene duration', async ({ page }) => {
    const durationInput = getDurationInput(page, 0);
    await durationInput.fill('10');
    await expect(durationInput).toHaveValue('10');

    // Total duration should update (10 + 5 + 3 = 18)
    await expect(page.getByText(/18s total/)).toBeVisible();
  });

  test('should edit text overlay', async ({ page }) => {
    const overlayInput = getOverlayInput(page, 0);
    await overlayInput.fill('Chapter 1: Introduction');
    await expect(overlayInput).toHaveValue('Chapter 1: Introduction');
  });

  test('should remove a scene', async ({ page }) => {
    const textareas = page.locator('textarea');
    await expect(textareas).toHaveCount(3);

    const removeButtons = page.getByLabel('Remove scene');
    await page.locator('textarea').first().hover();
    await removeButtons.first().click({ force: true });

    await expect(textareas).toHaveCount(2);
    await expect(page.getByText(/2 scenes/)).toBeVisible();
  });

  test('should reorder scenes with up/down buttons', async ({ page }) => {
    await fillSceneDescription(page, 0, 'First scene');
    await fillSceneDescription(page, 1, 'Second scene');
    await fillSceneDescription(page, 2, 'Third scene');

    // Move second scene up
    const moveUpButtons = page.getByLabel('Move scene up');
    await moveUpButtons.first().click();

    const textareas = page.locator('textarea');
    await expect(textareas.nth(0)).toHaveValue('Second scene');
    await expect(textareas.nth(1)).toHaveValue('First scene');

    await page.screenshot({
      path: 'test-results/02-scenes-reordered.png',
      fullPage: true,
    });
  });

  test('should not allow removing last scene', async ({ page }) => {
    const removeButtons = page.getByLabel('Remove scene');
    await removeButtons.first().click({ force: true });
    await removeButtons.first().click({ force: true });

    const textareas = page.locator('textarea');
    await expect(textareas).toHaveCount(1);
    await expect(page.getByLabel('Remove scene')).toHaveCount(0);
  });

  // ── Step 2: Style Selection ────────────────────────────────────────

  test('should navigate to style selection step', async ({ page }) => {
    await fillAllDefaultScenes(page);
    await clickNext(page);

    // All 6 style cards visible
    await expect(page.getByText('Corporate')).toBeVisible();
    await expect(page.getByText('Social Media')).toBeVisible();
    await expect(page.getByText('Cinematic')).toBeVisible();
    await expect(page.getByText('Tutorial')).toBeVisible();
    await expect(page.getByText('Energetic')).toBeVisible();
    await expect(
      page.locator('h3').filter({ hasText: 'Elegant' })
    ).toBeVisible();

    await expect(page.getByRole('button', { name: /Back/i })).toBeVisible();

    await page.screenshot({
      path: 'test-results/03-style-picker.png',
      fullPage: true,
    });
  });

  test('should select a different style', async ({ page }) => {
    await fillAllDefaultScenes(page);
    await clickNext(page);

    await page.getByText('Cinematic').click();

    const cinematicButton = page
      .locator('button')
      .filter({ hasText: 'Cinematic' });
    await expect(cinematicButton).toBeVisible();

    await page.screenshot({
      path: 'test-results/04-style-selected.png',
      fullPage: true,
    });
  });

  test('should navigate back from style to scenes', async ({ page }) => {
    await fillAllDefaultScenes(page);
    await clickNext(page);

    await expect(page.getByText('Corporate')).toBeVisible();
    await clickBack(page);

    await expect(page.locator('textarea').first()).toBeVisible();
    await expect(page.getByText('Add Scene')).toBeVisible();
  });

  // ── Step 3: Generation Summary ─────────────────────────────────────

  test('should show generation summary on step 3', async ({ page }) => {
    await navigateToGenerateStep(page);

    // Summary card
    await expect(page.getByText('Scenes').first()).toBeVisible();
    await expect(page.getByText('Duration').first()).toBeVisible();

    // Scene list with actual descriptions
    await expect(
      page.getByText('A golden sunrise over the ocean')
    ).toBeVisible();

    // Generate Video button
    await expect(
      page.getByRole('button', { name: /Generate Video/i })
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/05-generate-summary.png',
      fullPage: true,
    });
  });

  // ── Step 3: Live Generation (real Gemini + Pexels) ─────────────────

  test('should show loading state then generate with real API', async ({
    page,
  }) => {
    // Use 2 short scenes to keep API call fast
    // Remove 3rd default scene first
    const removeButtons = page.getByLabel('Remove scene');
    await page.locator('textarea').first().hover();
    await removeButtons.first().click({ force: true });

    await fillSceneDescription(page, 0, 'A sunset over the ocean with waves');
    await fillSceneDescription(page, 1, 'A mountain landscape with snow');

    // Set short durations
    await getDurationInput(page, 0).fill('3');
    await getDurationInput(page, 1).fill('3');

    // Navigate to step 3
    await clickNext(page); // to style (Corporate is default)
    await clickNext(page); // to generate

    // Click Generate Video -- this hits the REAL API
    await page.getByRole('button', { name: /Generate Video/i }).click();

    // Verify loading state appears immediately
    await expect(page.getByText('Analyzing your scenes...')).toBeVisible({
      timeout: 5_000,
    });

    await expect(page.getByText(/This may take 10/)).toBeVisible();

    await page.screenshot({
      path: 'test-results/06-loading-state.png',
      fullPage: true,
    });

    // Wait for the real API to return (Gemini + Pexels can take 10-60s)
    // Either we get a success toast, or the loading disappears and results show
    await expect(
      page.getByRole('button', { name: /Open in Editor/i })
    ).toBeVisible({ timeout: 60_000 });

    // Success toast from Sonner
    const successToast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /generated successfully/i });
    await expect(successToast).toBeVisible({ timeout: 5_000 });

    await page.screenshot({
      path: 'test-results/07-generation-success.png',
      fullPage: true,
    });
  });

  test('should display real matched clips with provider badges after generation', async ({
    page,
  }) => {
    // Single scene to minimize API time
    const removeButtons = page.getByLabel('Remove scene');
    await page.locator('textarea').first().hover();
    await removeButtons.first().click({ force: true });
    await removeButtons.first().click({ force: true });

    await fillSceneDescription(page, 0, 'A dog playing in a park');
    await getDurationInput(page, 0).fill('3');

    await clickNext(page); // to style
    await clickNext(page); // to generate

    // Generate with real API
    await page.getByRole('button', { name: /Generate Video/i }).click();

    // Wait for results
    await expect(
      page.getByRole('button', { name: /Open in Editor/i })
    ).toBeVisible({ timeout: 60_000 });

    // Verify real clip data is shown:
    // The scene editor in results mode shows "Matched Clip" label
    await expect(page.getByText('Matched Clip')).toBeVisible();

    // Provider badge should be visible (pexels or pixabay)
    const providerBadge = page.locator('span').filter({
      hasText: /^(pexels|pixabay)$/i,
    });
    await expect(providerBadge.first()).toBeVisible();

    // Clip duration should be shown (a number followed by "s")
    const clipDuration = page
      .locator('span')
      .filter({ hasText: /^\d+(\.\d+)?s$/ });
    await expect(clipDuration.first()).toBeVisible();

    await page.screenshot({
      path: 'test-results/08-matched-clips.png',
      fullPage: true,
    });
  });

  test('should redirect to editor after real generation', async ({ page }) => {
    // Single scene for speed
    const removeButtons = page.getByLabel('Remove scene');
    await page.locator('textarea').first().hover();
    await removeButtons.first().click({ force: true });
    await removeButtons.first().click({ force: true });

    await fillSceneDescription(page, 0, 'A cat sitting on a windowsill');
    await getDurationInput(page, 0).fill('3');

    await clickNext(page); // to style
    await clickNext(page); // to generate

    // Generate
    await page.getByRole('button', { name: /Generate Video/i }).click();

    // Wait for success
    await expect(
      page.getByRole('button', { name: /Open in Editor/i })
    ).toBeVisible({ timeout: 60_000 });

    // Click Open in Editor
    await page.getByRole('button', { name: /Open in Editor/i }).click();

    // Should navigate to /editor
    await page.waitForURL(/\/editor/, { timeout: 15_000 });

    // Verify composition was stored in sessionStorage
    const storedComposition = await page.evaluate(() =>
      sessionStorage.getItem('pendingComposition')
    );
    expect(storedComposition).toBeTruthy();

    // Parse and validate the real composition structure
    const composition = JSON.parse(storedComposition!);
    expect(composition).toHaveProperty('elements');
    expect(composition).toHaveProperty('transitions');
    expect(composition).toHaveProperty('duration');
    expect(composition).toHaveProperty('settings');
    expect(composition.settings).toEqual({
      width: 1920,
      height: 1080,
      fps: 30,
    });
    expect(composition.elements.length).toBeGreaterThan(0);
    expect(composition.duration).toBeGreaterThan(0);

    // Verify first element is a Video with a real stock footage URL
    const firstVideo = composition.elements.find(
      (el: { type: string }) => el.type === 'Video'
    );
    expect(firstVideo).toBeDefined();
    expect(firstVideo.src).toMatch(/^https?:\/\//);

    await page.screenshot({
      path: 'test-results/09-redirected-to-editor.png',
      fullPage: true,
    });
  });

  // ── Full End-to-End Flow ───────────────────────────────────────────

  test('should complete full wizard flow with real API end-to-end', async ({
    page,
  }) => {
    // Step 1: Configure scenes with real, descriptive content
    await fillSceneDescription(
      page,
      0,
      'Aerial shot of a city skyline at dawn'
    );
    await fillSceneDescription(page, 1, 'People drinking coffee in a cafe');
    await fillSceneDescription(page, 2, 'Close-up of hands typing on a laptop');

    // Set custom durations
    await getDurationInput(page, 0).fill('3');
    await getDurationInput(page, 1).fill('4');
    await getDurationInput(page, 2).fill('3');

    // Add text overlay to first scene
    await getOverlayInput(page, 0).fill('A Day in the City');

    await page.screenshot({
      path: 'test-results/10-full-flow-scenes.png',
      fullPage: true,
    });

    // Step 2: Select Cinematic style
    await clickNext(page);
    await page.getByText('Cinematic').click();

    await page.screenshot({
      path: 'test-results/11-full-flow-style.png',
      fullPage: true,
    });

    // Step 3: Verify summary and generate
    await clickNext(page);

    // Summary should reflect our inputs
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Cinematic/)).toBeVisible();
    await expect(
      page.getByText('Aerial shot of a city skyline at dawn')
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/12-full-flow-summary.png',
      fullPage: true,
    });

    // Generate with real API
    await page.getByRole('button', { name: /Generate Video/i }).click();

    // Verify loading state
    await expect(page.getByText('Analyzing your scenes...')).toBeVisible({
      timeout: 5_000,
    });

    // Wait for real results (up to 60s for Gemini + Pexels)
    await expect(
      page.getByRole('button', { name: /Open in Editor/i })
    ).toBeVisible({ timeout: 60_000 });

    // Verify real clips were matched
    const matchedClipLabels = page.getByText('Matched Clip');
    const matchedCount = await matchedClipLabels.count();
    expect(matchedCount).toBeGreaterThan(0);

    await page.screenshot({
      path: 'test-results/13-full-flow-results.png',
      fullPage: true,
    });

    // Open in editor
    await page.getByRole('button', { name: /Open in Editor/i }).click();
    await page.waitForURL(/\/editor/, { timeout: 15_000 });

    // Final validation: composition has elements from all scenes
    const storedComposition = await page.evaluate(() =>
      sessionStorage.getItem('pendingComposition')
    );
    expect(storedComposition).toBeTruthy();
    const composition = JSON.parse(storedComposition!);
    expect(composition.elements.length).toBeGreaterThanOrEqual(3);

    await page.screenshot({
      path: 'test-results/14-full-flow-editor.png',
      fullPage: true,
    });
  });
});
