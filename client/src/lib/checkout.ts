
export async function initiateCheckout(planSlug: string) {
  console.log('🚀 Initiating checkout for plan:', planSlug);
  console.log('🌐 Current URL:', window.location.href);
  
  try {
    console.log('📤 Sending checkout intent request...');
    const response = await fetch('/api/checkout/intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ planSlug }),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      console.error('❌ Response not OK. Content-Type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        console.error('❌ Checkout error (JSON):', error);
        throw new Error(error.error || 'Failed to create checkout intent');
      } else {
        const text = await response.text();
        console.error('❌ Checkout error (non-JSON):', text);
        throw new Error('Server error: ' + response.statusText);
      }
    }

    const data = await response.json();
    console.log('✅ Checkout data received:', JSON.stringify(data, null, 2));
    
    // Follow the redirect
    if (data.redirect) {
      console.log('🔄 Redirecting to:', data.redirect);
      console.log('🔄 Using window.location.href for redirect...');
      
      // Use href instead of replace for better compatibility
      window.location.href = data.redirect;
      
      // Return a promise that never resolves to prevent further execution
      return new Promise(() => {});
    } else {
      console.error('❌ No redirect URL in response:', data);
      throw new Error('No redirect URL provided');
    }
  } catch (error) {
    console.error('💥 Checkout initiation error:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}
