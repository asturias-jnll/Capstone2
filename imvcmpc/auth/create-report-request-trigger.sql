-- Replace function/trigger that referenced users.role with a roles join

CREATE OR REPLACE FUNCTION create_report_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    request_number TEXT;
    notification_title TEXT;
    notification_content TEXT;
    assigned_mc UUID;
BEGIN
    -- Auto-pick a marketing_clerk (prefer same branch if provided)
    SELECT u.id INTO assigned_mc
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name = 'marketing_clerk'
      AND u.is_active = true
      AND (NEW.branch_id IS NULL OR u.branch_id = NEW.branch_id)
    ORDER BY u.created_at
    LIMIT 1;

    IF assigned_mc IS NOT NULL THEN
        request_number := 'RR-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
        notification_title := 'Report Request ' || request_number || ' Received';
        notification_content := 'A finance officer has requested a report. Please review and take action.';

        INSERT INTO notifications (
            user_id, branch_id, title, content, category, type, status,
            reference_type, reference_id, is_highlighted, priority, metadata
        ) VALUES (
            assigned_mc,
            NEW.branch_id,
            notification_title,
            notification_content,
            'important',
            'warning',
            'pending',
            'report_request',
            NEW.id,
            TRUE,
            'important',
            jsonb_build_object(
                'redirect', '/marketingclerk/html/reports.html?from=report_request&requestId=' || NEW.id,
                'report_type', NEW.report_type,
                'config', NEW.report_config,
                'branch_id', NEW.branch_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger on report_requests
DROP TRIGGER IF EXISTS trigger_create_report_request_notification ON report_requests;
CREATE TRIGGER trigger_create_report_request_notification
    AFTER INSERT ON report_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_report_request_notification();


