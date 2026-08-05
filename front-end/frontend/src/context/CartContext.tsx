"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

import {
  getGuestSessionId,
  getStoredSession,
  getVerifiedAuthToken,
} from "@/lib/auth";

export type Variant = {
  weight: string;
  priceModifier: number;
};

export type CartItem = {
  id: number;
  name: string;
  basePrice: number;
  price: number;
  quantity: number;
  variant: string;
  image?: string;
};

export type Product = {
  id: number;
  name: string;
  category: string;
  basePrice: number;
  rating: number;
  notes: string;
};

interface AppContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number, variant: string) => void;
  updateQuantity: (id: number, variant: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartReady: boolean;
  favorites: Product[];
  toggleFavorite: (product: Product) => void;
  isFavorite: (id: number) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export function AppProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [isCartReady, setIsCartReady] = useState(false);
  const didInitialize = useRef(false);

  const syncCartState = (payload: unknown) => {
    const data = payload as { items?: CartItem[] } | undefined;
    setCart(Array.isArray(data?.items) ? data.items : []);
  };

  const fetchCart = useCallback(async () => {
    const token = await getVerifiedAuthToken();
    const sessionId = getGuestSessionId();
    const url = token
      ? `${API_BASE_URL}/cart/me`
      : `${API_BASE_URL}/cart?sessionId=${encodeURIComponent(sessionId)}`;

    const response = await fetch(url, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : { "x-session-id": sessionId },
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Unable to fetch cart");
    }

    syncCartState(payload.data);
    return payload.data;
  }, []);

  const attachGuestCartToUser = useCallback(async () => {
    const token = await getVerifiedAuthToken();

    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/cart/attach-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId: getGuestSessionId(),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Unable to attach guest cart");
    }

    syncCartState(payload.data);
    return payload.data;
  }, []);

  useEffect(() => {
    getGuestSessionId();
  }, []);

  useEffect(() => {
    const initializeCart = async () => {
      try {
        const session = getStoredSession();

        if (session?.token) {
          await attachGuestCartToUser();
          await fetchCart();
        } else {
          await fetchCart();
        }
      } catch (error) {
        console.error("Failed to initialize cart", error);
      } finally {
        setIsCartReady(true);
      }
    };

    const handleAuthChange = async () => {
      try {
        const session = getStoredSession();

        if (session?.token) {
          await attachGuestCartToUser();
          await fetchCart();
        } else {
          await fetchCart();
        }
      } catch (error) {
        console.error("Failed to resync cart after auth change", error);
        setCart([]);
      } finally {
        setIsCartReady(true);
      }
    };

    if (!didInitialize.current) {
      didInitialize.current = true;
      void initializeCart();
    }

    window.addEventListener("auth-changed", handleAuthChange);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, [attachGuestCartToUser, fetchCart]);

  const addToCart = (item: CartItem) => {
    void (async () => {
      try {
        const token = await getVerifiedAuthToken();
        const sessionId = getGuestSessionId();
        const url = token
          ? `${API_BASE_URL}/cart/me/items`
          : `${API_BASE_URL}/cart/items`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : { "x-session-id": sessionId }),
          },
          body: JSON.stringify({
            ...(token ? {} : { sessionId }),
            item,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "Unable to add item to cart");
        }

        syncCartState(payload.data);
      } catch (error) {
        console.error("Failed to add item to cart", error);
      }
    })();
  };

  const removeFromCart = (id: number, variant: string) => {
    void (async () => {
      try {
        const token = await getVerifiedAuthToken();
        const sessionId = getGuestSessionId();
        const url = token
          ? `${API_BASE_URL}/cart/me/items`
          : `${API_BASE_URL}/cart/items`;

        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : { "x-session-id": sessionId }),
          },
          body: JSON.stringify({
            ...(token ? {} : { sessionId }),
            productId: id,
            variant,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "Unable to remove item from cart");
        }

        syncCartState(payload.data);
      } catch (error) {
        console.error("Failed to remove cart item", error);
      }
    })();
  };

  const updateQuantity = (id: number, variant: string, quantity: number) => {
    if (quantity < 1) {
      return;
    }

    void (async () => {
      try {
        const token = await getVerifiedAuthToken();
        const sessionId = getGuestSessionId();
        const url = token
          ? `${API_BASE_URL}/cart/me/items`
          : `${API_BASE_URL}/cart/items`;

        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : { "x-session-id": sessionId }),
          },
          body: JSON.stringify({
            ...(token ? {} : { sessionId }),
            productId: id,
            variant,
            quantity,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "Unable to update quantity");
        }

        syncCartState(payload.data);
      } catch (error) {
        console.error("Failed to update cart quantity", error);
      }
    })();
  };

  const clearCart = () => {
    void (async () => {
      try {
        const token = await getVerifiedAuthToken();
        const sessionId = getGuestSessionId();
        const url = token
          ? `${API_BASE_URL}/cart/me/clear`
          : `${API_BASE_URL}/cart/clear`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : { "x-session-id": sessionId }),
          },
          body: JSON.stringify({
            ...(token ? {} : { sessionId }),
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "Unable to clear cart");
        }

        syncCartState(payload.data);
      } catch (error) {
        console.error("Failed to clear cart", error);
        setCart([]);
      }
    })();
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  const toggleFavorite = (product: Product) => {
    setFavorites((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const isFavorite = (id: number) => {
    return favorites.some((p) => p.id === id);
  };

  return (
    <AppContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isCartReady,
        favorites,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

export const useCart = useAppContext;
