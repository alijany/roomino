-- Six personas for the attendance E2E suite.
--  1 employee in «توسعه»          4 admin
--  2 approver of «توسعه», and an    5 employee in «پشتیبانی» — outside
--    employee there themselves       user 2's team
--  3 hr                             6 signed-in user with no profile
INSERT INTO user_entity (created_at,updated_at,first_name,last_name,phone,national_id,is_approved) VALUES
 (now(),now(),'سارا','کارمند','+989120000011','0011111111',true),
 (now(),now(),'رضا','سرپرست','+989120000012','0022222222',true),
 (now(),now(),'نگار','منابع‌انسانی','+989120000013','0033333333',true),
 (now(),now(),'مدیر','سیستم','+989120000014','0044444444',true),
 (now(),now(),'علی','پشتیبان','+989120000015','0055555555',true),
 (now(),now(),'مهمان','بی‌پروفایل','+989120000016','0066666666',true);

INSERT INTO roles_entity (created_at,updated_at,role,user_id,invitation_status) VALUES
 (now(),now(),'user',1,'accepted'),
 (now(),now(),'user',2,'accepted'),
 (now(),now(),'hr',3,'accepted'),(now(),now(),'user',3,'accepted'),
 (now(),now(),'admin',4,'accepted'),
 (now(),now(),'user',5,'accepted'),
 (now(),now(),'user',6,'accepted');
