// Check for highlight request from URL parameter (from notification)
async function checkForHighlightRequest() {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('highlightRequest');
    
    if (requestId) {
        console.log('📌 Highlighting request:', requestId);
        
        // Wait a bit for the page to load
        setTimeout(async () => {
            // Open the pending requests modal
            await showPendingRequests();
            
            // Wait for modal to be created
            setTimeout(() => {
                // Find and highlight the specific request
                const requestElement = document.querySelector(`[data-request-id="${requestId}"]`);
                if (requestElement) {
                    // Add highlight class
                    requestElement.classList.add('request-highlighted');
                    
                    // Scroll to the highlighted request
                    requestElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Remove the query parameter from URL
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                    
                    console.log('✅ Request highlighted successfully');
                } else {
                    console.warn('⚠️ Request element not found:', requestId);
                }
            }, 500);
        }, 1000);
    }
}
