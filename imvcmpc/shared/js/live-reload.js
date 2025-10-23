/**
 * Smart Live Reload for Development
 * Only refreshes when actual file changes are detected (not on a timer)
 */

(function() {
    'use strict';
    
    // Only run in development (when running on localhost)
    if (!window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1')) {
        return;
    }

    const POLL_INTERVAL = 1000; // Check every 1 second (faster detection)
    let lastModified = {};
    let isReloading = false;
    let userIsTyping = false;
    let typingTimeout = null;
    let hasInitialized = false;

    // Track when user is typing in input fields
    document.addEventListener('input', () => {
        userIsTyping = true;
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            userIsTyping = false;
        }, 3000); // Wait 3 seconds after last input before allowing refresh
    }, true);

    // Get ETag or Last-Modified for better change detection
    async function getFileTimestamp(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            // Try ETag first (more reliable), fallback to Last-Modified
            const etag = response.headers.get('etag');
            const lastMod = response.headers.get('last-modified');
            
            return etag || lastMod || Date.now().toString();
        } catch (error) {
            console.debug('[Live Reload] Failed to get timestamp for:', url, error.message);
            return null;
        }
    }

    // Check for HTML changes
    async function checkHTMLChanges() {
        if (isReloading || userIsTyping) return;

        try {
            const currentPage = window.location.pathname;
            const timestamp = await getFileTimestamp(currentPage);
            
            if (!timestamp) return;

            // Only reload if we have a previous timestamp AND it has changed
            if (hasInitialized && lastModified[currentPage] && timestamp !== lastModified[currentPage]) {
                console.log('[Live Reload] 📄 HTML changes detected, reloading page...');
                isReloading = true;
                window.location.reload(true); // Force reload from server
                return;
            }
            
            lastModified[currentPage] = timestamp;
        } catch (error) {
            console.debug('[Live Reload] HTML check failed:', error.message);
        }
    }

    // Check for CSS changes and hot-reload them
    async function checkCSSChanges() {
        if (isReloading) return;

        try {
            const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            
            for (const link of stylesheets) {
                let href = link.href;
                
                // Skip external stylesheets
                if (!href || href.startsWith('http://') && !href.includes(window.location.hostname)) {
                    continue;
                }
                if (href.startsWith('https://')) continue;
                
                // Remove cache busting parameter to get clean URL
                const cleanHref = href.split('?')[0];
                const timestamp = await getFileTimestamp(cleanHref);
                
                if (!timestamp) continue;

                // Only reload if we have a previous timestamp AND it has changed
                if (hasInitialized && lastModified[cleanHref] && timestamp !== lastModified[cleanHref]) {
                    console.log('[Live Reload] 🎨 CSS changes detected, hot-reloading:', cleanHref);
                    // Hot-reload the stylesheet without page refresh
                    link.href = cleanHref + '?t=' + Date.now();
                }
                
                lastModified[cleanHref] = timestamp;
            }
        } catch (error) {
            console.debug('[Live Reload] CSS check failed:', error.message);
        }
    }

    // Check for JavaScript file changes
    async function checkJSChanges() {
        if (isReloading || userIsTyping) return;

        try {
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            
            for (const script of scripts) {
                let src = script.src;
                
                // Skip external scripts and the live-reload script itself
                if (!src || src.includes('live-reload.js')) continue;
                if (src.startsWith('https://')) continue;
                if (src.startsWith('http://') && !src.includes(window.location.hostname)) continue;
                
                const cleanSrc = src.split('?')[0];
                const timestamp = await getFileTimestamp(cleanSrc);
                
                if (!timestamp) continue;

                // JS changes require full page reload
                if (hasInitialized && lastModified[cleanSrc] && timestamp !== lastModified[cleanSrc]) {
                    console.log('[Live Reload] 📜 JavaScript changes detected, reloading page...');
                    isReloading = true;
                    window.location.reload(true);
                    return;
                }
                
                lastModified[cleanSrc] = timestamp;
            }
        } catch (error) {
            console.debug('[Live Reload] JS check failed:', error.message);
        }
    }

    // Initialize and start monitoring
    async function initialize() {
        console.log('[Live Reload] 🚀 Smart reload active - watching for file changes...');
        
        // Get initial timestamps for all files
        await checkHTMLChanges();
        await checkCSSChanges();
        await checkJSChanges();
        
        // Mark as initialized - now changes will trigger reloads
        hasInitialized = true;
        
        console.log('[Live Reload] ✅ Baseline established. Changes will trigger auto-reload.');
    }

    // Start monitoring for changes
    function startMonitoring() {
        setInterval(async () => {
            if (!isReloading && !userIsTyping) {
                await Promise.all([
                    checkHTMLChanges(),
                    checkCSSChanges(),
                    checkJSChanges()
                ]);
            }
        }, POLL_INTERVAL);
    }

    // Visual indicator
    const indicator = document.createElement('div');
    indicator.textContent = '🔄';
    indicator.title = 'Live Reload Active - Only refreshes on file changes';
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 5px 10px;
        border-radius: 50%;
        font-size: 16px;
        z-index: 9999;
        opacity: 0.7;
        cursor: help;
        transition: opacity 0.3s;
    `;
    
    indicator.addEventListener('click', () => {
        const info = Object.keys(lastModified).length;
        console.log('[Live Reload] Monitoring', info, 'files:', Object.keys(lastModified));
        alert(`Live Reload Active\n\nMonitoring ${info} files\nChanges will trigger auto-refresh\nTyping protection: Active`);
    });
    
    indicator.onmouseover = () => indicator.style.opacity = '1';
    indicator.onmouseout = () => indicator.style.opacity = '0.7';
    
    // Add indicator after DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(indicator);
            initialize().then(startMonitoring);
        });
    } else {
        document.body.appendChild(indicator);
        initialize().then(startMonitoring);
    }
})();
