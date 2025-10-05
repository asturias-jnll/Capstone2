// Check for highlight request from URL parameter (from notification)
async function checkForHighlightRequest() {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('highlightRequest');
    
    if (requestId) {
        console.log('📌 Highlighting request:', requestId);
        
        // Wait a bit for the page to load
        setTimeout(async () => {
            console.log('🔄 Opening pending requests modal...');
            // Open the pending requests modal
            await showPendingRequests();
            
            // Wait for modal to be created and content to load
            setTimeout(() => {
                console.log('🔍 Looking for request element...');
                // Find and highlight the specific request
                const requestElement = document.querySelector(`[data-request-id="${requestId}"]`);
                if (requestElement) {
                    console.log('🎯 Found request element, adding highlight...');
                    
                    // Add highlight class
                    requestElement.classList.add('request-highlighted');
                    
                    // Force a style refresh to ensure CSS is applied
                    requestElement.style.display = 'none';
                    requestElement.offsetHeight; // Trigger reflow
                    requestElement.style.display = '';
                    
                    // Scroll to the highlighted request
                    requestElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Add a visual indicator that this is the highlighted request
                    const requestHeader = requestElement.querySelector('.request-header');
                    if (requestHeader) {
                        const highlightBadge = document.createElement('span');
                        highlightBadge.textContent = '✨ HIGHLIGHTED';
                        highlightBadge.style.cssText = `
                            background: #F59E0B;
                            color: white;
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-size: 10px;
                            font-weight: bold;
                            margin-left: 8px;
                            animation: pulse-highlight 1s ease-in-out infinite;
                        `;
                        requestHeader.appendChild(highlightBadge);
                    }
                    
                    // Remove the query parameter from URL
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                    
                    console.log('✅ Request highlighted successfully');
                    console.log('🎨 Applied class:', requestElement.classList.contains('request-highlighted'));
                    
                    // Remove highlight after 10 seconds
                    setTimeout(() => {
                        requestElement.classList.remove('request-highlighted');
                        
                        const highlightBadge = requestElement.querySelector('span[style*="HIGHLIGHTED"]');
                        if (highlightBadge) {
                            highlightBadge.remove();
                        }
                        console.log('🔄 Highlight removed after 10 seconds');
                    }, 10000);
                    
                } else {
                    console.warn('⚠️ Request element not found:', requestId);
                    const allRequestElements = document.querySelectorAll('[data-request-id]');
                    console.log('Available request elements:', Array.from(allRequestElements).map(el => ({
                        id: el.getAttribute('data-request-id'),
                        text: el.textContent.substring(0, 50) + '...'
                    })));
                }
            }, 1200); // Increased delay to ensure modal content is fully loaded
        }, 1000);
    }
}
