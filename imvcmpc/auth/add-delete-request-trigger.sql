-- Update the change request notification trigger to handle deletion requests

CREATE OR REPLACE FUNCTION create_change_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    request_number TEXT;
    notification_title TEXT;
    notification_content TEXT;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        request_number := 'CR-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
        
        -- Different notification based on request type
        IF NEW.request_type = 'deletion' THEN
            notification_title := 'Delete Request ' || request_number || ' Received';
            notification_content := 'A marketing clerk has requested to delete a transaction. Please review and take action.';
        ELSE
            notification_title := 'New Request ' || request_number || ' Received';
            notification_content := 'A marketing clerk has submitted change request #' || request_number || '. Please review and take action.';
        END IF;
        
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
            notification_title,
            notification_content,
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_change_request_notification ON change_requests;
CREATE TRIGGER trigger_create_change_request_notification
    AFTER INSERT ON change_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_change_request_notification();
