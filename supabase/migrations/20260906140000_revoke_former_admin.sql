-- Revoke administrator access; ordinary player access follows the domain policy.
delete from game_private.admin_emails
where email = 'staff.admin@partner.example';
