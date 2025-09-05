// debug.js

// Function to simulate login and check response
async function debugLogin() {
    const loginUrl = 'http://localhost:5009/api/auth/login';
    const data = { password: 'unimedia' };
    
    try {
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        console.log('Login Response:', result);
        
        if (response.ok) {
            console.log('Login successful');
            
            // Try to fetch reminders
            await debugFetchReminders();
        } else {
            console.error('Login failed');
        }
    } catch (error) {
        console.error('Error during login:', error);
    }
}

// Function to fetch reminders with authentication header
async function debugFetchReminders() {
    const remindersUrl = 'http://localhost:5009/api/reminders';
    
    try {
        const response = await fetch(remindersUrl, {
            method: 'GET',
            headers: {
                'X-User-Logged-In': 'true'
            }
        });
        
        const result = await response.json();
        console.log('Reminders Response:', result);
        
        if (response.ok) {
            console.log('Successfully fetched reminders');
        } else {
            console.error('Failed to fetch reminders');
        }
    } catch (error) {
        console.error('Error fetching reminders:', error);
    }
}

// Run the debug functions
debugLogin();