/* MYLA Landing Page Controller */

document.addEventListener('DOMContentLoaded', () => {
  // --- Theme Toggle logic ---
  const themeToggleBtn = document.getElementById('theme-toggle');
  const bodyElement = document.body;

  // Load cached theme or default to system preference (dark theme default)
  const cachedTheme = localStorage.getItem('myla_theme');
  if (cachedTheme === 'light') {
    bodyElement.classList.add('light-theme');
  }

  themeToggleBtn.addEventListener('click', () => {
    bodyElement.classList.toggle('light-theme');
    const activeTheme = bodyElement.classList.contains('light-theme') ? 'light' : 'dark';
    localStorage.setItem('myla_theme', activeTheme);
  });

  // --- Modal Controllers ---
  const waitlistModal = document.getElementById('waitlist-modal');
  const openModalBtns = document.querySelectorAll('.open-waitlist-btn');
  const closeModalBtns = document.querySelectorAll('.modal-close-btn');

  const openModal = () => {
    waitlistModal.classList.add('active');
    waitlistModal.setAttribute('aria-hidden', 'false');
    // Lock scroll on background body
    bodyElement.style.overflow = 'hidden';
  };

  const closeModal = () => {
    waitlistModal.classList.remove('active');
    waitlistModal.setAttribute('aria-hidden', 'true');
    // Restore scroll
    bodyElement.style.overflow = '';
    resetFormState();
  };

  openModalBtns.forEach(btn => btn.addEventListener('click', openModal));
  closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));

  // Close modal when clicking outside content frame
  waitlistModal.addEventListener('click', (event) => {
    if (event.target === waitlistModal) {
      closeModal();
    }
  });

  // --- Waitlist Form submission logic ---
  const waitlistForm = document.getElementById('waitlist-form');
  const waitlistFormContainer = document.getElementById('waitlist-form-container');
  const waitlistSuccessContainer = document.getElementById('waitlist-success-container');
  const waitlistErrorBanner = document.getElementById('waitlist-error-banner');
  const submitWaitlistBtn = document.getElementById('submit-waitlist-btn');
  const registeredEmailSpan = document.getElementById('registered-email');

  const resetFormState = () => {
    waitlistForm.reset();
    waitlistFormContainer.classList.remove('hidden');
    waitlistSuccessContainer.classList.add('hidden');
    waitlistErrorBanner.classList.add('hidden');
    waitlistErrorBanner.textContent = '';
    submitWaitlistBtn.disabled = false;
    submitWaitlistBtn.textContent = 'Submit Request';
  };

  waitlistForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Clear previous error banners
    waitlistErrorBanner.classList.add('hidden');
    waitlistErrorBanner.textContent = '';

    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const walletInput = document.getElementById('user-wallet');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const wallet = walletInput ? walletInput.value.trim() : '';

    if (!name || !email) {
      showError('Please fill out all required fields.');
      return;
    }

    if (wallet) {
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      if (!base58Regex.test(wallet)) {
        showError('Please enter a valid Solana wallet address (Base58).');
        return;
      }
    }

    // Set loading button state
    submitWaitlistBtn.disabled = true;
    submitWaitlistBtn.textContent = 'Joining waitlist...';

    try {
      // Connect to Firebase Cloud Function endpoint
      const response = await fetch('https://us-central1-myla-fb363.cloudfunctions.net/joinWaitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, walletAddress: wallet || undefined }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to submit. Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Show success layout sheet
        registeredEmailSpan.textContent = email;
        waitlistFormContainer.classList.add('hidden');
        waitlistSuccessContainer.classList.remove('hidden');
      } else {
        throw new Error(result.message || 'An unexpected error occurred.');
      }
    } catch (err) {
      console.error('Waitlist submission error:', err);
      showError(err.message || 'Failed to connect to waitlist server. Please try again.');
    } finally {
      // Restore button status if form didn't succeed
      if (!waitlistFormContainer.classList.contains('hidden')) {
        submitWaitlistBtn.disabled = false;
        submitWaitlistBtn.textContent = 'Submit Request';
      }
    }
  });

  const showError = (message) => {
    waitlistErrorBanner.textContent = message;
    waitlistErrorBanner.classList.remove('hidden');
  };
});
