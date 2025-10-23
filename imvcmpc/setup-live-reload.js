/**
 * Setup Script: Add Live Reload to All HTML Files
 * Run this once to inject live-reload script into all HTML pages
 */

const fs = require('fs');
const path = require('path');

// Directories containing HTML files
const htmlDirs = [
    './shared/html',
    './financeofficer/html',
    './marketingclerk/html',
    './ithead/html',
    './logpage'
];

// Live reload script tag to inject
const liveReloadScript = `
    <!-- Live Reload for Development -->
    <script src="/shared/js/live-reload.js"></script>
`;

// Process each HTML file
function processHTMLFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if live-reload script is already added
        if (content.includes('live-reload.js')) {
            console.log(`✓ Already has live-reload: ${filePath}`);
            return;
        }
        
        // Find the closing </body> tag and inject before it
        if (content.includes('</body>')) {
            content = content.replace('</body>', `${liveReloadScript}\n</body>`);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Added live-reload to: ${filePath}`);
        } else {
            console.log(`⚠ No </body> tag found in: ${filePath}`);
        }
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
    }
}

// Process all directories
function processDirectory(dir) {
    try {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isFile() && file.endsWith('.html')) {
                processHTMLFile(filePath);
            }
        });
    } catch (error) {
        console.error(`✗ Error processing directory ${dir}:`, error.message);
    }
}

// Main execution
console.log('🔄 Setting up live-reload for all HTML files...\n');

htmlDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`Processing directory: ${dir}`);
        processDirectory(dir);
    } else {
        console.log(`⚠ Directory not found: ${dir}`);
    }
});

console.log('\n✅ Live-reload setup complete!');
console.log('📝 Note: New HTML files will need to manually include:');
console.log('   <script src="/shared/js/live-reload.js"></script>');
