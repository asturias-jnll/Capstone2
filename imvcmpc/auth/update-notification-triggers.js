// Update notification triggers with request numbers
const { Pool } = require('pg');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const pool = new Pool(config.database);

async function updateTriggers() {
    try {
        console.log('🔄 Updating notification triggers...\n');
        
        // Update the FO notification trigger (from schema.sql)
        console.log('1️⃣ Updating Finance Officer notification trigger...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION create_change_request_notification()
            RETURNS TRIGGER AS $$
            DECLARE
                request_number TEXT;
            BEGIN
                -- Create notification for the assigned finance officer
                IF NEW.assigned_to IS NOT NULL THEN
                    -- Generate a readable request number from the first 8 characters of UUID
                    request_number := 'CR-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
                    
                    INSERT INTO notifications (
                        user_id,
                        branch_id,
                        title,
                        content,
                        category,
                        type,
                        status,
                        reference_type,
                        reference_id,
                        is_highlighted,
                        priority
                    ) VALUES (
                        NEW.assigned_to,
                        NEW.branch_id,
                        'New Request ' || request_number || ' Received',
                        'A marketing clerk has submitted change request #' || request_number || '. Please review and take action.',
                        'important',
                        'warning',
                        'pending',
                        'change_request',
                        NEW.id,
                        TRUE,
                        'important'
                    );
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('   ✅ Finance Officer notification trigger updated\n');
        
        // Update the MC notification trigger (requester)
        console.log('2️⃣ Updating Marketing Clerk notification trigger...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION notify_change_request_requester()
            RETURNS TRIGGER AS $$
            DECLARE
                request_number TEXT;
            BEGIN
                -- Create notification for the requester when status changes from pending to approved/rejected
                IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
                    -- Generate a readable request number from the first 8 characters of UUID
                    request_number := 'CR-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
                    
                    INSERT INTO notifications (
                        user_id,
                        branch_id,
                        title,
                        content,
                        category,
                        type,
                        status,
                        reference_type,
                        reference_id,
                        is_highlighted,
                        priority
                    ) VALUES (
                        NEW.requested_by,
                        NEW.branch_id,
                        CASE 
                            WHEN NEW.status = 'approved' THEN 'Request ' || request_number || ' Approved'
                            WHEN NEW.status = 'rejected' THEN 'Request ' || request_number || ' Rejected'
                        END,
                        CASE 
                            WHEN NEW.status = 'approved' THEN 
                                'Your change request #' || request_number || ' has been approved. ' ||
                                COALESCE('Note: ' || NEW.finance_officer_notes, 'The changes have been implemented.')
                            WHEN NEW.status = 'rejected' THEN 
                                'Your change request #' || request_number || ' has been rejected. ' ||
                                COALESCE('Reason: ' || NEW.finance_officer_notes, 'Please contact the Finance Officer for more details.')
                        END,
                        'important',
                        CASE 
                            WHEN NEW.status = 'approved' THEN 'success'
                            WHEN NEW.status = 'rejected' THEN 'error'
                        END,
                        'completed',
                        'change_request',
                        NEW.id,
                        TRUE,
                        'important'
                    );
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('   ✅ Marketing Clerk notification trigger updated\n');

        // Ensure ONLY one report_request trigger exists and uses RR-number title + metadata
        console.log('3️⃣ Ensuring single report_request trigger with metadata...');
        // Drop any extra triggers on report_requests except our canonical name
        await pool.query(`
            DO $$
            DECLARE r RECORD;
            BEGIN
              FOR r IN (
                SELECT tgname FROM pg_trigger t
                JOIN pg_class c ON c.oid = t.tgrelid
                WHERE NOT t.tgisinternal AND c.relname = 'report_requests'
                  AND tgname <> 'trigger_create_report_request_notification'
              ) LOOP
                EXECUTE format('DROP TRIGGER IF EXISTS %I ON report_requests', r.tgname);
              END LOOP;
            END $$;
        `);

        // Recreate function and trigger from our SQL definition (safe idempotent)
        const rrSql = fs.readFileSync(path.join(__dirname, 'create-report-request-trigger.sql'), 'utf8');
        await pool.query(rrSql);
        console.log('   ✅ Report request trigger ensured\n');
        
        console.log('✨ All notification triggers updated successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Request numbers now appear in notification titles');
        console.log('   ✅ Clicking "Take Action" will highlight the specific request');
        console.log('   ✅ System ready for testing\n');
        
    } catch (error) {
        console.error('❌ Error updating triggers:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

updateTriggers();
