-- Five test users for the finance E2E suites. Roles are peers, matched exactly,
-- so users 2 and 3 deliberately hold two each.
INSERT INTO user_entity (created_at,updated_at,first_name,last_name,phone,is_approved) VALUES
 (now(),now(),'کارمند','یک','+989120000001',true),
 (now(),now(),'تأییدکننده','یک','+989120000002',true),
 (now(),now(),'مالی','یک','+989120000003',true),
 (now(),now(),'مدیر','سیستم','+989120000004',true),
 (now(),now(),'کارمند','دو','+989120000005',true);

INSERT INTO roles_entity (created_at,updated_at,role,user_id,invitation_status) VALUES
 (now(),now(),'user',1,'accepted'),
 (now(),now(),'approver',2,'accepted'),(now(),now(),'user',2,'accepted'),
 (now(),now(),'finance',3,'accepted'),(now(),now(),'user',3,'accepted'),
 (now(),now(),'admin',4,'accepted'),
 (now(),now(),'user',5,'accepted');
