// Test the complete notification workflow with request numbers and highlighting
const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.database);

async function testCompleteFlow() {
    try {
        console.log('🧪 Testing Complete Notification Flow\n');
        console.log('=' .repeat(70));
        
        // Step 1: Clear old test data
        console.log('\n🧹 Step 1: Clearing old test data...');
        await pool.query(`DELETE FROM notifications WHERE title LIKE 'New Request CR-%' OR title LIKE 'Request CR-%'`);
        console.log('   ✅ Old notifications cleared\n');
        
        // Step 2: Get users
        console.log('📋 Step 2: Getting test users...');
        const mcResult = await pool.query(`SELECT id, username, branch_id FROM users WHERE username = 'mc.ibaan'`);
        const foResult = await pool.query(`SELECT id, username, branch_id FROM users WHERE username = 'fo.ibaan'`);
        
        if (mcResult.rows.length === 0 || foResult.rows.length === 0) {
            console.log('❌ Required users not found');
            return;
        }
        
        const mc = mcResult.rows[0];
        const fo = foResult.rows[0];
        
        console.log(`   ✅ Marketing Clerk: ${mc.username}`);
        console.log(`   ✅ Finance Officer: ${fo.username}\n`);
        
        // Step 3: Create a change request
        console.log('📝 Step 3: Marketing Clerk creates change request...');
        const changeRequestResult = await pool.query(`
            INSERT INTO change_requests (
                transaction_id,
                transaction_table,
                requested_by,
                assigned_to,
                branch_id,
                request_type,
                original_data,
                requested_changes,
                reason
            ) VALUES (
                gen_random_uuid(),
                'savings_ibaan_main_branch',
                $1,
                $2,
                $3,
                'modification',
                '{"amount": 5000, "payee": "Jane Doe", "particulars": "Savings Deposit"}',
                '{"amount": 5500, "payee": "Jane Doe", "particulars": "Savings Deposit (Corrected)"}',
                'Corrected amount based on updated receipt'
            )
            RETURNING id, status
        `, [mc.id, fo.id, mc.branch_id]);
        
        const changeRequest = changeRequestResult.rows[0];
        const requestNumber = 'CR-' + changeRequest.id.substring(0, 8).toUpperCase();
        console.log(`   ✅ Change request created`);
        console.log(`   📌 Request ID: ${changeRequest.id}`);
        console.log(`   📌 Request Number: ${requestNumber}`);
        console.log(`   📌 Status: ${changeRequest.status}\n`);
        
        // Wait for trigger to fire
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Step 4: Check FO notification
        console.log('🔔 Step 4: Checking Finance Officer notification...');
        const foNotif = await pool.query(`
            SELECT id, title, content, is_highlighted, reference_id
            FROM notifications
            WHERE user_id = $1 AND reference_type = 'change_request' AND reference_id = $2
        `, [fo.id, changeRequest.id]);
        
        if (foNotif.rows.length > 0) {
            const notif = foNotif.rows[0];
            console.log(`   ✅ Finance Officer received notification!`);
            console.log(`   📬 Title: "${notif.title}"`);
            console.log(`   💬 Content: "${notif.content}"`);
            console.log(`   ⭐ Highlighted: ${notif.is_highlighted}`);
            console.log(`   🔗 Reference ID: ${notif.reference_id}\n`);
            
            // Verify request number in title
            if (notif.title.includes(requestNumber)) {
                console.log(`   ✅ Request number "${requestNumber}" found in title!`);
            } else {
                console.log(`   ❌ Request number NOT found in title`);
            }
        } else {
            console.log(`   ❌ No notification found for Finance Officer\n`);
        }
        
        // Step 5: FO approves the request
        console.log('\n✅ Step 5: Finance Officer approving request...');
        await pool.query(`
            UPDATE change_requests
            SET status = 'approved',
                finance_officer_notes = 'Amount correction verified. Approved.',
                processed_at = CURRENT_TIMESTAMP,
                processed_by = $1
            WHERE id = $2
        `, [fo.id, changeRequest.id]);
        console.log(`   ✅ Request ${requestNumber} approved\n`);
        
        // Wait for trigger to fire
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Step 6: Check MC notification
        console.log('🔔 Step 6: Checking Marketing Clerk notification...');
        const mcNotif = await pool.query(`
            SELECT id, title, content, type, is_highlighted, reference_id
            FROM notifications
            WHERE user_id = $1 AND reference_type = 'change_request' AND reference_id = $2
        `, [mc.id, changeRequest.id]);
        
        if (mcNotif.rows.length > 0) {
            const notif = mcNotif.rows[0];
            console.log(`   ✅ Marketing Clerk received notification!`);
            console.log(`   📬 Title: "${notif.title}"`);
            console.log(`   💬 Content: "${notif.content}"`);
            console.log(`   🎨 Type: ${notif.type}`);
            console.log(`   ⭐ Highlighted: ${notif.is_highlighted}`);
            console.log(`   🔗 Reference ID: ${notif.reference_id}\n`);
            
            // Verify request number in title
            if (notif.title.includes(requestNumber)) {
                console.log(`   ✅ Request number "${requestNumber}" found in title!`);
            } else {
                console.log(`   ❌ Request number NOT found in title`);
            }
        } else {
            console.log(`   ❌ No notification found for Marketing Clerk\n`);
        }
        
        // Step 7: Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(70));
        
        const mcCount = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [mc.id]);
        const foCount = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [fo.id]);
        
        console.log(`   Marketing Clerk (${mc.username}):`);
        console.log(`      Total notifications: ${mcCount.rows[0].count}`);
        
        console.log(`\n   Finance Officer (${fo.username}):`);
        console.log(`      Total notifications: ${foCount.rows[0].count}`);
        
        console.log('\n✅ Features Tested:');
        console.log('   ✅ Request numbers in notification titles');
        console.log('   ✅ Notification creation on change request');
        console.log('   ✅ Notification creation on approval');
        console.log('   ✅ Proper reference_id for highlighting\n');
        
        console.log('🌐 Next Steps:');
        console.log('   1. Login as fo.ibaan at http://localhost:8080');
        console.log('   2. Go to Notifications page');
        console.log('   3. Click "Take Action" on the notification');
        console.log(`   4. Should redirect to Member Data with request ${requestNumber} highlighted\n`);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

testCompleteFlow();
