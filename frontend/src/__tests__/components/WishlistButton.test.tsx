import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WishlistButton from '@/components/product/WishlistButton';

// Mock the APIs and contexts used inside WishlistButton
vi.mock('@/lib/api', () => ({
  wishlistApi: {
    check:  vi.fn().mockResolvedValue({ data: { inWishlist: false } }),
    toggle: vi.fn().mockResolvedValue({ data: { inWishlist: true  } }),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: true }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('WishlistButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<WishlistButton productId="prod-1" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls toggle when clicked', async () => {
    const { wishlistApi } = await import('@/lib/api');
    render(<WishlistButton productId="prod-1" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(wishlistApi.toggle).toHaveBeenCalledWith('prod-1');
    });
  });

  it('renders text variant with label', () => {
    render(<WishlistButton productId="prod-1" variant="text" />);
    // In text variant the label should be visible
    const btn = screen.getByRole('button');
    expect(btn.textContent).toBeTruthy();
  });
});
