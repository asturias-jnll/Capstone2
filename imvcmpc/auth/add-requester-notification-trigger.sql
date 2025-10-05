-- Add trigger to notify marketing clerk when their change request is processed
-- This completes the notification workflow:
-- 1. Marketing Clerk requests change → Finance Officer gets notified (existing)
-- 2. Finance Officer approves/rejects → Marketing Clerk gets notified (THIS NEW TRIGGER)

-- Function to create notification for the requester when their change request is processed
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
            NEW.requested_by,  -- Notify the person who requested the change
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
            'new_request',
            NEW.id,
            TRUE,  -- Highlight this notification
            'important'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists before creating it
DROP TRIGGER IF EXISTS trigger_notify_change_request_requester ON change_requests;

-- Trigger to automatically notify requester when their change request is processed
CREATE TRIGGER trigger_notify_change_request_requester
    AFTER UPDATE ON change_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_change_request_requester();

-- Success message
SELECT 'Requester notification trigger created successfully!' AS status;
