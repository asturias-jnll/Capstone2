// Check for highlight request from URL parameter (from notification)
async function checkForHighlightRequest() {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('highlightRequest');
    
    if (requestId) {
        console.log('📌 Highlighting request:', requestId);
        
        // Wait a bit for the page to load
        setTimeout(async () => {
            console.log('🔄 Opening pending requests modal with highlight...');
            
            // Open the pending requests modal with highlight parameter
            await showFinanceOfficerRequests(requestId);
            
            // Clear the URL parameter to prevent re-highlighting on refresh
            window.history.replaceState({}, document.title, 'memberdata.html');
        }, 500);
    }
}
