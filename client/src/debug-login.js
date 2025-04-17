// Debug helper function to test login from browser console
// Usage: copy and paste into browser console
async function testLogin(username = 'testuser2', password = 'password123') {
  try {
    // Make direct fetch request to bypass React components
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.error('Login failed with status:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return false;
    }
    
    const userData = await response.json();
    console.log('Login successful! User data:', userData);
    
    // Verify the session by making a request to /api/user
    const userResponse = await fetch('/api/user', {
      credentials: 'include',
    });
    
    if (!userResponse.ok) {
      console.error('Session verification failed with status:', userResponse.status);
      return false;
    }
    
    const verifiedUser = await userResponse.json();
    console.log('Session verified! User data:', verifiedUser);
    return true;
  } catch (error) {
    console.error('Login test error:', error);
    return false;
  }
}

// Optional: Run the test automatically
testLogin().then(success => {
  console.log('Login test completed. Success:', success);
});