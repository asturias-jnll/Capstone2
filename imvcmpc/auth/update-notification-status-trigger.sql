-- Update the unhighlight trigger to also mark notification as completed

CREATE OR REPLACE FUNCTION unhighlight_change_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Unhighlight and mark as completed when change request status changes to approved or rejected
    IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
        UPDATE notifications
        SET 
            is_highlighted = FALSE,
            status = 'completed'
        WHERE reference_type = 'change_request'
          AND reference_id = NEW.id
          AND user_id = NEW.assigned_to;  -- Only update FO's notification
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_unhighlight_change_request_notification ON change_requests;
CREATE TRIGGER trigger_unhighlight_change_request_notification
    AFTER UPDATE ON change_requests
    FOR EACH ROW
    EXECUTE FUNCTION unhighlight_change_request_notification();

-- Success message
SELECT 'Notification status trigger updated successfully!' AS status;
