import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
);

export const getStripe = async () => {
  return stripePromise;
};

export const createCheckoutSession = async (
  priceId: string,
  planType: string,
) => {
  console.log("🚀 Creating checkout session:", { priceId, planType });

  try {
    const response = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ priceId, planType }),
    });

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await response.json();
        console.error("❌ Checkout session error (JSON):", error);
        throw new Error(
          error.details || error.error || "Failed to create checkout session",
        );
      } else {
        const text = await response.text();
        console.error("❌ Checkout session error (non-JSON):", text);
        throw new Error("Server error: " + response.statusText);
      }
    }

    const { url } = await response.json();
    console.log("✅ Checkout URL received:", url);

    if (!url) {
      throw new Error("No checkout URL received from server");
    }

    console.log("🔄 Redirecting to Stripe checkout...");
    window.location.href = url;

    // Return a promise that never resolves to prevent further execution
    return new Promise(() => {});
  } catch (error) {
    console.error("💥 Checkout session failed:", error);
    throw error;
  }
};

export const createCreditsCheckout = async (creditsData: any) => {
  console.log("💳 Creating credits checkout:", creditsData);

  try {
    const response = await fetch("/api/stripe/create-credits-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      // Prevent auto-following to an HTML page (e.g., sign-in redirect)
      redirect: "manual",
      body: JSON.stringify(creditsData),
    });

    console.log("📡 Response status:", response.status);

    // Read body as text first so we can inspect it if it's not JSON
    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text();

    // Handle non-2xx early with helpful diagnostics
    if (!response.ok) {
      if (contentType.includes("application/json")) {
        let errJson: any = {};
        try {
          errJson = JSON.parse(bodyText);
        } catch {}
        console.error("❌ Credits checkout error (JSON):", errJson);
        throw new Error(
          errJson.details || errJson.error || `API ${response.status}`,
        );
      } else {
        console.error(
          "❌ Credits checkout error (non-JSON):",
          bodyText.slice(0, 300),
        );
        // Special-case redirects that were blocked by redirect:'manual'
        if (
          response.type === "opaqueredirect" ||
          (response.status >= 300 && response.status < 400)
        ) {
          throw new Error(
            "Request was redirected (likely to a sign-in page). Ensure the API returns JSON 401 instead of redirecting.",
          );
        }
        throw new Error(
          `Server error ${response.status}: expected JSON but got ${contentType}`,
        );
      }
    }

    // Success path: ensure JSON
    if (!contentType.includes("application/json")) {
      console.error(
        "ℹ️ Non-JSON success body first bytes:",
        bodyText.slice(0, 200),
      );
      throw new Error(
        `Expected JSON but got "${contentType}". Is the route returning HTML?`,
      );
    }

    const data = JSON.parse(bodyText) as {
      url?: string;
      sessionId?: string;
      error?: string;
    };

    if (data.error) {
      throw new Error(data.error);
    }

    if (data.url) {
      console.log("✅ Credits checkout URL received:", data.url);
      window.location.assign(data.url);
      return; // don’t leave a dangling never-resolving promise
    }

    // Optional: support sessionId fallback if server doesn’t return a URL
    if (data.sessionId) {
      const { getStripe } = await import("@/lib/stripe");
      const stripe = await getStripe();
      if (!stripe) throw new Error("Stripe.js failed to load");
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });
      if (error) throw error;
      return;
    }

    throw new Error("No checkout URL or sessionId received from server");
  } catch (error) {
    console.error("💥 Credits checkout failed:", error);
    throw error;
  }
};

export const checkPaymentStatus = async (sessionId: string) => {
  const response = await fetch(`/api/stripe/session-status/${sessionId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to check payment status");
  }

  return response.json();
};
